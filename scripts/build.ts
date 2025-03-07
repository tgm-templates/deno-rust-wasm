import {encode} from "https://deno.land/std@0.100.0/encoding/base64.ts";
import {compress} from "https://deno.land/x/brotli@v0.1.4/mod.ts";
import {minify} from "https://jspm.dev/terser@5.7.1";

const name = "@moduleName@";

const encoder = new TextEncoder();

async function requires(...executables: string[]) {
    const where = Deno.build.os === "windows" ? "where" : "which";

    for (const executable of executables) {
        const process = Deno.run({
            cmd: [where, executable],
            stderr: "null",
            stdin: "null",
            stdout: "null",
        });

        if (!(await process.status()).success) {
            err(`Could not find required build tool ${executable}`);
        }
    }
}

async function run(msg: string, cmd: string[]) {
    log(msg);

    const process = Deno.run({cmd});

    if (!(await process.status()).success) {
        err(`${msg} failed`);
    }
}

function log(text: string): void {
    console.log(`[log] ${text}`);
}

function err(text: string): never {
    console.log(`[err] ${text}`);
    return Deno.exit(1);
}

await requires("rustup", "rustc", "cargo", "wasm-pack");

if (!(await Deno.stat("Cargo.toml")).isFile) {
    err(`the build script should be executed in the "${name}" root`);
}

await run(
    "building using wasm-pack",
    ["wasm-pack", "build", "--target", "web", "--release"],
);

const wasm = await Deno.readFile(`pkg/${name}_bg.wasm`);
const compressed = compress(wasm);
log(
    `compressed wasm using lz4, size reduction: ${wasm.length -
    compressed.length} bytes`,
);
const encoded = encode(compressed);
log(
    `encoded wasm using base64, size increase: ${encoded.length -
    compressed.length} bytes`,
);

log("inlining wasm in js");
const source = `import * as brotli from "https://deno.land/x/brotli@v0.1.4/mod.ts";
                export const source = brotli.decompress(Uint8Array.from(atob("${encoded}"), c => c.charCodeAt(0)));`;

const init = await Deno.readTextFile(`pkg/${name}.js`);

log("minifying js");
const output: any = await minify(`${source}${init}`, {
    mangle: {module: true},
    output: {
        preamble: "//deno-fmt-ignore-file",
    },
});

if (output.error) {
    err(`encountered error when minifying: ${output.error}`);
}

const reduction = new Blob([(`${source}${init}`)]).size -
    new Blob([output.code]).size;
log(`minified js, size reduction: ${reduction} bytes`);

log(`writing output to file ("wasm.js")`);
await Deno.writeFile("wasm.js", encoder.encode(output.code));

const outputFile = await Deno.stat("wasm.js");
log(
    `output file ("wasm.js"), final size is: ${outputFile.size} bytes`,
);
