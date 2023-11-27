const translate = function (key) {
  // Read proper translated text using translate key,
  // if the key isn't provided by the language return
  // the key itself. The key's name should be in English
  // (en-US) and describe the string clear enough.
  if (!this[key]) return key;
  if (!this[key].text) return key;
  return this[key].text;
};

const zh_CN = Object.freeze({
  // 简体中文
  translate: translate,
  title: {
    innerText: "自测网站",
  },
  page_title: {
    innerText: "自测网站",
  },
  url_input: {
    placeholder: "输入文件URL...",
  },
  get_button: {
    innerText: "获取",
    title: "从指定URL获取题库(.qst文件)",
  },
  upload_button: {
    innerText: "上传",
    title: "从本地上传题库(.qst文件)",
  },
  upload_your_file: {
    innerText: "题库文件",
  },
  submit_button: {
    innerText: "提交",
    title: "提交你的答案",
  },
  confirm_version_1: {
    text: "你上传的题库版本（",
  },
  confirm_version_2: {
    text: "）比当前存储版本（",
  },
  confirm_version_3: {
    text: "）旧，要替换新版吗？",
  },
  choose_saved_libraries: {
    innerText: "选择已保存的题库：",
  },
  error_loading_libraries: {
    text: "加载已保存的题库失败，将清空已保存题库。",
  },
  reference_question_not_found: {
    text: "未定义的引用问题，请检查题库文件。",
  },
  library_not_found: {
    text: "未找到题库。",
  },
  show_answer_button: {
    innerText: "显示答案",
    title: "显示正确答案",
  },
  hide_answer_button: {
    innerText: "隐藏答案",
    title: "隐藏正确答案",
  },
  side_bar_button: {
    title: "打开侧边栏",
  },
  info_name: {
    text: "名称：",
  },
  info_author: {
    text: "作者：",
  },
  info_version: {
    text: "版本：",
  },
  info_description: {
    text: "描述：",
  },
  info_subject: {
    text: "学科：",
  },
  library_info_title: {
    innerText: "题库信息",
  },
});

const en_US = Object.freeze({
  // English
  translate: translate,
  title: {
    innerText: "Self Test",
  },
  page_title: {
    innerText: "Self Test Website",
  },
  url_input: {
    placeholder: "File URL here...",
  },
  get_button: {
    innerText: "Get",
    title: "Get your questions file (.qst) from the url",
  },
  upload_button: {
    innerText: "Upload",
    title: "Upload your questions file (.qst) here...",
  },
  upload_your_file: {
    innerText: "your file",
  },
  submit_button: {
    innerText: "Submit",
    title: "Submit your answers",
  },
  confirm_version_1: {
    text: "The uploaded file version (",
  },
  confirm_version_2: {
    text: ") is older than the current storage version (",
  },
  confirm_version_3: {
    text: "). Do you want to replace the newer version?",
  },
  choose_saved_libraries: {
    innerText: "Choose from saved libraries: ",
  },
  error_loading_libraries: {
    text: "Error occurred when loading saved libraries. Will clear local storage.",
  },
  reference_question_not_found: {
    text: "Reference question not found. Please check the file.",
  },
  library_not_found: {
    text: "Library not found.",
  },
  show_answer_button: {
    innerText: "Show Answers",
    title: "Show the correct answers",
  },
  hide_answer_button: {
    innerText: "Hide Answers",
    title: "Hide the correct answers",
  },
  side_bar_button: {
    title: "Open the sidebar",
  },
  info_name: {
    text: "Name: ",
  },
  info_author: {
    text: "Author: ",
  },
  info_description: {
    text: "Description: ",
  },
  info_version: {
    text: "Version: ",
  },
  info_subject: {
    text: "Subject: ",
  },
  library_info_title: {
    innerText: "Library Info",
  },
});

function getLang(name) {
  switch (name) {
    case "zh-CN":
      return zh_CN;
    case "en-US":
      return en_US;
    default:
      return en_US; // use English as a fallback
  }
}

export { getLang };
