/* 2022-11-7 */
/* 严格意义上来说,需要将全部使用的后端字段保存,但实际使用中,
这样过于繁琐且无意义,因此暂时只需要保存多处复用的字段作为常量,
以及后端未提供定义的字段,也可以在这里进行常量保存,
以及其他任何应该要保存在这边的常量字段 */
/* 1.开始替换模块开发时部分模块多处使用字段的字段命名
2.目的是模块开发中多处使用的字段,在中期修改功能和后期维护时,只需要修改一处地方,减少漏掉修改出现的问题
3.好处:整体来说在初始化定义好模块后
前期:前端可以自己先定义字段,多处使用,不必因为后端效率问题影响前端字段使用
中期:方便修改功能不会遗漏字段修改
后期:便于维护代码
其他:方便人其他开发人员查看代码*/
/* 命名规则:(后面都需要中文注释)
层级1:模块名称
层级2:字段用处:
三种命名写法:
1.可直接使用中文作为key名
2.使用英文时统一使用全大写+下划线的方式命名
3.使用拼音时统一使用首字母大写剩余小写+下划线的方式命名（在有简单英文使用的情况下不建议使用）
*/
//未备注类型的,默认应该为string,有则应该要补上注释
const fieldMap = {
  "新前向合同":{
    "IT类一次性账目项":"revenuePlanDisposable",//array
    "IT类按月账目项":"revenuePlanMonth",//array
    "CT类一次性账目项":"ictSpRevenueCtDisposable",//array
    "CT类按月账目项":"ictSpRevenueCtMonth",//array
    "非周期收款项":"beforeContractCycleCollectMoney",//array
    "周期收款项":"beforeContractAcyclicCollectMoney",//array
  },
  "新后向合同":{
    "新非周期支出项":"ictSpExpendPlanCycleList",//array
    "旧非周期支出项":"afterContractCyclePayMoney",//array
    "新周期支出项":"ictSpExpendPlanAcyclicList",//array
    "旧周期支出项":"afterContractAcyclicPayMoney",//array
    "新一次性会计科目项":"ictSpExpendPlanDisposableList",//array
    "旧一次性会计科目项":"afterContractDisposableCost",//array
    "新按月会计科目项":"ictSpExpendPlanMonthList",//array
    "旧按月会计科目项":"afterContractMonthCost",//array
  },
}

let bindToGlobal = (obj, key) => {
   if (typeof window[key] === 'undefined') {
       window[key] = {};
   }

   for (let i in obj) {
       window[key][i] = obj[i]
   }
}
bindToGlobal(fieldMap,'_fieldMap');
console.log("部分模块-多处使用字段-中文常量表",_fieldMap);
export default _fieldMap;