const path = require("path");

module.exports = {
    mode: "none",
    entry: {
        app: "./src/app.ts"
    },
    
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "dist")
    },
    resolve: {
        alias: {
            three: path.resolve("./node_modules/three")
        },
        extensions: [".js", ".ts"]
    },
    module: {
        rules: [
            {
                use: "ts-loader",
                exclude: /node_modules/,
            }
        ]
    }
};
