const zh_CN = {
  page_title: {
    innerText: "自测网站"
  },
  url_input: {
    placeholder: "输入文件URL..."
  },
  get_button: {
    innerText: "获取"
  },
  upload_button: {
    innerText: "上传"
  },
  upload_your_file: {
    innerText: "题库文件"
  },
  submit_button: {
    innerText: "提交"
  },
  confirm_version_1: {
    text: "你上传的题库版本（"
  },
  confirm_version_2: {
    text: "）比当前存储版本（"
  },
  confirm_version_3: {
    text: "）旧，要替换新版吗？"
  },
  choose_saved_libraries: {
    innerText: "选择已保存的题库："
  }
}

const en_US = {
  page_title: {
    innerText: "Self Test Website"
  },
  url_input: {
    placeholder: "File URL here..."
  },
  get_button: {
    innerText: "Get"
  },
  upload_button: {
    innerText: "Upload"
  },
  upload_your_file: {
    innerText: "your file"
  },
  submit_button: {
    innerText: "Submit"
  },
  confirm_version_1: {
    text: "The uploaded file version ("
  },
  confirm_version_2: {
    text: ") is older than the current storage version ("
  },
  confirm_version_3: {
    text: "). Do you want to replace the newer version?"
  },
  choose_saved_libraries: {
    innerText: "Choose from saved libraries: "
  }
}

function getLang(name) {
  switch (name) {
    case "zh-CN":
      return zh_CN;
    case "en-US":
      return en_US;
    default:
      return en_US;
  }
}

export { getLang }