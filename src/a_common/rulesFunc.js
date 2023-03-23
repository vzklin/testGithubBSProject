//验证用函数统一公用保存
//用途1:复用
//用途2:保存服务端配置用验证函数
let isDevelopment = process.env.NODE_ENV === "development";

const industryLabelRules = (rule, value, callback) => {
  if (value) {
    try{
      let arr = value;
      if(Array.isArray(arr)){
        if( new Set(arr.map(item=>item[0])).size > 3 ){
          callback(new Error("行业一级标签最多选择三个!"));
        }
        else{
          callback();
        }
      }
      else{
        callback(new Error("行业一级标签最多选择三个!"));
      }

    }catch(error){
      callback(new Error("行业一级标签最多选择三个!"));
    }
  }
  else{
    callback();
  }
}

export default {
  industryLabelRules,
};
