const path = require("path");
const webpack = require("webpack");


module.exports = {
	entry: "./src/index.js",
	mode: 'development',
	output: {
		filename: 'main.js',
		path: path.resolve(__dirname, "dist")
	},
	devServer: {
		contentBase: "./dist",
		hot: true,
	},
	plugins: [
		new webpack.HotModuleReplacementPlugin(),
	],
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
			buffer: require.resolve("buffer"),
			assert: require.resolve("assert")
		}
	}
};
