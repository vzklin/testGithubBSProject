//监听用函数统一公用保存
//用途1:复用
//用途2:保存服务端配置用验证函数
let isDevelopment = process.env.NODE_ENV === "development";

const testWatchFunc = ({
  value=null,
  prop=null,
  colConfig=null,
  rowIndex=null}={}) => {
  
}

export default {
  testWatchFunc,
};
