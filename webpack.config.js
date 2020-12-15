const path = require("path");

module.exports = {
	entry: "./src/index.js",
	output: {
		filename: "main.js",
		path: path.resolve(__dirname, "dist")
	},
	target: "node",
	devtool: "inline-source-map",
	devServer: {
		contentBase: "./dist",
		compress: true
	},
	module: {
		rules: [
			{
				test: /\.css$/i,
				use: ["style-loader", "css-loader"]
			},
			{
				test: /\.(js|jsx)$/,
				exclude: /(ammo|node_modules)/,
				use: {
					loader: "babel-loader",
					options: {
						presets: ["@babel/preset-env", "@babel/preset-react"],
						cacheDirectory: true
					}
				}
			}
		]
	},
	resolve: {
		fallback: {
			path: require.resolve("path-browserify"),
			fs: require.resolve("fs-extra"),
			constants: require.resolve("constants-browserify"),
			stream: require.resolve("stream-browserify"),
			buffer: require.resolve("buffer/"),
			assert: require.resolve("assert/")
		}
	}
};
