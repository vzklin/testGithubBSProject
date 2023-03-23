<template>
  <div class="helloWorld">
    <img class="bg" src="@/assets/logo.svg">
    <div class="main-tip">辅助用提示</div>
    <simple3DTemplate></simple3DTemplate>
    <div class="main-tip">辅助用提示</div>
  </div>
</template>

<script>
import simple3DTemplate from "@/views/simple3DTemplate.vue";
export default {
  components:{
    simple3DTemplate,
  },
  name: 'HelloWorld',
  data () {
    return {
      msg: 'Welcome to Your Vue.js App',
    }
  },
  computed:{
    computed_item(){
      let comVal = this.$useState();
      return comVal;
    },
  },
  watch:{
    computed_item:{
      handler(val){
        console.log(this.$options.name+"-"+"computed_item",val);
      },
    },
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
.helloWorld{
  // width: 100vw;
  height: 100vh;
  .bg{
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
  }
}
.main-tip{
  font-size: 24px;
  color: darkgreen;
  font-weight: bold;
  height: 50px;
  width: 100%;
}
</style>
