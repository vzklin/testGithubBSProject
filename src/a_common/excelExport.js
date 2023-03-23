import XLSX from 'xlsx'
// JSONData为导出的json数据,fileName为导出的文件名,title为导出的第一行标题,filter为过滤字段,rowLength为标题长度
export function JSONToExcelConvertor(JSONData, FileName, title, filter, rowlength) {
  if (!JSONData) { return }
  // 转化json为object
  var arrData = typeof JSONData !== 'object' ? JSON.parse(JSONData) : JSONData
 
  var excel = '<table id="exportTable" style="font-size:14px;background:#fff;">'
 
  // 设置表头
  var row = '<tr style="background: #409eff;color: #ffffff;height: 45px;">'
  if (title) {
    // 使用标题项
    for (var i in title) {
      row += "<th align='center' style='border-right:1px solid #dfe6ec;border-bottom:1px solid #dfe6ec;'>" + title[i] + '</th>' // 将标题新增到row中
    }
  } else {
    // 不使用标题项
    for (var i in arrData[0]) {
      row += "<th align='center'>" + i + '</th>'
    }
  }
 
  excel += row + '</tr>'
  // 设置数据
  for (var i = 0; i < arrData.length; i++) {
    if (i === arrData.length - 1) {
      var row = '<tr style="color: #606266;height: 45px;">'
    } else {
      var row = '<tr style="color: #606266;height: 45px;">'
    }
    for (var index in arrData[i]) {
      // 判断是否有过滤行
      if (filter) {
        var value = ''
        if (filter.indexOf(index) === -1) { // 过滤掉符合关键字的数据
          for (var k = 0; k < (arrData.length / rowlength); k++) { // 循环到一个标题长度换一次行,否则数组会在一行
            if (i === rowlength - 1) {
              for (var j = k * rowlength; j < ((k + 1) * rowlength); j++) {
                if (arrData[j].type === 'radio-group' || arrData[j].type === 'checkbox-group' || arrData[j].type === 'select') { // 如果为这三种格式,则他们的值储存在values中
                  var groupLenght = arrData[j].values.length
                  for (var q = 0; q < groupLenght; q++) {
                    if (arrData[j].values[q].selected === true) { // 获取被选中的值
                      value = value + arrData[j].values[q].label
                    }
                  }
                } else {
                  value = arrData[j].value == null ? '' : arrData[j].value
                }
                row += `<td>` + value + '</td>'
                value = ''
              }
            }
            excel += row + '</tr>'
            row = ''
          }
        }
      } else {
        // 不过滤的逻辑
        var value = arrData[i][index] == null ? '' : arrData[i][index]
        // eslint-disable-next-line quotes
        row += "<td align='center' style='border-right:1px solid #dfe6ec;border-bottom:1px solid #dfe6ec;'>" + value + '</td>'
      }
    }
    excel += row + '</tr>'
  }
 
  excel += '</table>'

  //保留样式的做法
  exportWithStyle(excel,FileName);
  // let excelBlob;
  //原本的
  // var objE = document.createElement('div') // 因为我们这里的数据是string格式的,但是js-xlsx需要dom格式,则先新建一个div然后把数据加入到innerHTML中,在传childNodes[0]即使dom格式的数据
  // objE.innerHTML = excel
  // var sheet = XLSX.utils.table_to_sheet(objE.childNodes[0], { raw: true })// 将一个table对象转换成一个sheet对象,raw为true的作用是把数字当成string,身份证不转换成科学计数法
  // excelBlob = sheet2blob(sheet, FileName);
  
  // openDownloadDialog(excelBlob, FileName);

}

function exportWithStyle(excel,fileName){
  let excelBlob = new Blob([excel], {type: 'application/vnd.ms-excel'});
  if(window.navigator.msSaveOrOpenBlob){
    window.navigator.msSaveOrOpenBlob(excelBlob,fileName);
  }else{
    var oa = document.createElement('a');
    oa.href = URL.createObjectURL(excelBlob);
    oa.download = fileName;
    document.body.appendChild(oa);
    oa.click();
    oa.remove();
  }
};
 
// 将一个sheet转成最终的excel文件的blob对象，然后利用URL.createObjectURL下载
function sheet2blob(sheet, sheetName) {
  sheetName = sheetName || 'sheet1' // 不存在sheetName时使用sheet1代替
  var workbook = {
    SheetNames: [sheetName],
    Sheets: {}
  }
  workbook.Sheets[sheetName] = sheet // 生成excel的配置项
 
  var wopts = {
    bookType: 'xlsx', // 要生成的文件类型
    bookSST: false, // 是否生成Shared String Table，官方解释是，如果开启生成速度会下降，但在低版本IOS设备上有更好的兼容性
    type: 'binary' // 二进制格式
  }
  var wbout = XLSX.write(workbook, wopts)
  var blob = new Blob([s2ab(wbout)], {
    type: 'application/octet-stream'
  }) // 字符串转ArrayBuffer
  function s2ab(s) {
    var buf = new ArrayBuffer(s.length)
    var view = new Uint8Array(buf)
    for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF
    return buf
  }
  return blob
}
// 下载的方法
function openDownloadDialog(url, saveName) {
  console.log(url);
  if (window.navigator.msSaveBlob) {
    window.navigator.msSaveBlob(url, saveName)
  }
  else{
    if (typeof url === 'object' && url instanceof Blob) {
      console.log(url);
      url = URL.createObjectURL(url) // 创建blob地址
    }
    else{
      var aLink = document.createElement('a')
      aLink.href = url
      aLink.download = saveName || '' // HTML5新增的属性，指定保存文件名，可以不要后缀，注意，file:///模式下不会生效
      var event
      if (window.MouseEvent) event = new MouseEvent('click')
      else {
        event = document.createEvent('MouseEvents')
        event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
      }
      aLink.dispatchEvent(event)
    }
  }
  
}