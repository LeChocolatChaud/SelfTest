import { parse } from "./parser.js"

$(function () {
  $("#upload-button").on("click", (e) => {
		let temp_input = document.createElement("input");
		temp_input.type = "file";
		temp_input.style.display = "none";
		temp_input.onchange = () => {
			let file = temp_input.files[0];
			let reader = new FileReader();
			reader.readAsText(file, "UTF-8");
			reader.onloadend = () => {
				let library = parse(reader.result);
				console.log(library);
			};
		};
		temp_input.click();
	});
});
