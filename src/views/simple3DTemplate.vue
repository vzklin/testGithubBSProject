<template>
  <div>
    <canvas id="three"></canvas>
    <button @click="zhuanDongClick">转动</button>
    <button @click="suoFangClick">缩放</button>
    <button @click="pingYiClick">平移</button>
  </div>
</template>

<script>
import * as THREE from 'three';

import { createMultiMaterialObject } from 'three/examples/jsm/utils/SceneUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'



export default {
  data(){
    return {
      scene:null,
      camera:null,
      renderer:null,
      cube:null,
      animationId:{},
      animationExtraParams:{
        suoFang:{},
        pingYi:{},
      },
      stats:null,
    };
  },
  mounted() {
    this.initThree();
    this.initControlsPanel();
    this.initFPS();
    this.$useState().counter++;
    console.log("this.$useState()",this.$useState());
  },
  props:{
    config:{
      type: Object,
      default(){ return {} }
    },
  },
  computed:{
    // boxStyle(){
    //   let boxWidth = this.config.boxWidth?this.config.boxWidth:300;
    //   let boxHeight = this.config.boxHeight?this.config.boxHeight:300;
    //   let comVal = `width: ${boxWidth}px; height: ${boxHeight}px;`;
    //   return comVal;
    // },
    
    // boxWidth:Number,
    // boxHeight:Number,
    
    // length:Number,
    // width:Number,
    // height:Number,
  },
  methods: {
    zhuanDongClick(){
      this.clickAnimateCommon({typeKey:"zhuanDong",animateDetail:()=>{
        this.cube.rotateY(0.1);
      }})
    },
    suoFangClick(){
      this.clickAnimateCommon({typeKey:"suoFang",animateDetail:()=>{
        let scale = this.animationExtraParams.suoFang.scale?this.animationExtraParams.suoFang.scale:1;
        if(scale<0.1){
          this.animationExtraParams.suoFang.scaleType = "big";
        }
        else if(scale>2){
          this.animationExtraParams.suoFang.scaleType = "small";
        }
        let scaleType = this.animationExtraParams.suoFang.scaleType;
        switch(scaleType){
          case 'big':
            scale += 0.01; 
            break;
          case 'small':
          default:
            scale -= 0.01; 
            break;
        }
        this.cube.scale.set(scale,scale,scale);
        this.animationExtraParams.suoFang.scale = scale;
      }})
    },
    pingYiClick(){
      this.clickAnimateCommon({typeKey:"pingYi",animateDetail:()=>{
        let num = this.animationExtraParams.pingYi.num??0;
        if(num<-4){
          this.animationExtraParams.pingYi.type = "right";
        }
        else if(num>4){
          this.animationExtraParams.pingYi.type = "left";
        }
        let numType = this.animationExtraParams.pingYi.type;
        switch(numType){
          case 'right':
            num += 0.1; 
            break;
          case 'left':
          default:
            num -= 0.1; 
            break;
        }
        this.cube.position.set(num,0,0);
        this.animationExtraParams.pingYi.num = num;
      }})
    },
    clickAnimateCommon({typeKey="",animateDetail=()=>{}}){
      if(this.animationId[typeKey]){
        this.cancelAnimate({typeKey:typeKey});
      }
      else{
        this.animateBasic({typeKey:typeKey,animateDetail:animateDetail});
      }
    },
    animateBasic({typeKey="",animateDetail=()=>{}}){
      animateDetail();
      this.renderer.render(this.scene, this.camera);
      this.animationId[typeKey] = requestAnimationFrame(()=>{
        this.animateBasic({typeKey:typeKey,animateDetail:animateDetail});
      });
      this.stats.update(); //更新性能插件
    },
    cancelAnimate({typeKey="",animateDetail=()=>{}}){
      cancelAnimationFrame(this.animationId[typeKey]);
      this.animationId[typeKey] = null;
    },
    initControlsPanel(){
      // 实例化dat.GUI对象
      var gui = new dat.GUI();
      // 定义对象，设置需要修改的数据
      var controls = {
          positionX:0,
          positionY:0,
          positionZ:0
      };
      // 把需要修改的配置添加dat.GUI对象中
      //gui.add(修改的配置对象, 配置对象中修改的数据名称, 修改数据边界的起始点, 修改数据边界的终止点)
      // onChange: 只要数据发生了变化 就会触发onchange方法
      gui.add(controls, "positionX", -10, 10).onChange(updatePosition);
      gui.add(controls, "positionY", -1, 1).onChange(updatePosition);
      gui.add(controls, "positionZ", -1, 1).onChange(updatePosition);

      // 定义更新模型位置函数
      function updatePosition() {
           // 设置网格在页面中的位置
          this.cube.position.set(controls.positionX, controls.positionY, controls.positionZ);
      }
    },
    initFPS(){
      let stats = new Stats();
      document.body.appendChild(stats.dom);
      this.stats = stats;
    },

    initThree() {
      
      // 1、创建场景
      var scene = new THREE.Scene();
      scene.background = new THREE.Color('#eee')
      scene.fog = new THREE.Fog('#eee', 20, 100)

      const canvas = document.querySelector('#three')
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
      renderer.shadowMap.enabled = true;
      //设置清晰度
      renderer.setPixelRatio(window.devicePixelRatio);
      let boxWidth = this.config.boxWidth?this.config.boxWidth:window.innerWidth;
      let boxHeight = this.config.boxHeight?this.config.boxHeight:window.innerHeight;
      //设置输出canvas的宽高
      renderer.setSize(boxWidth, boxHeight);

      // 2、创建相机（透视投影相机）
      var camera = new THREE.PerspectiveCamera(
          5, // 相机视野//调整为输出canvas的比例
          boxWidth / boxHeight, // 水平方向和竖直方向长度的比值
          // 1,
          0.1, // 近端渲染距离
          1000 // 远端渲染距离
      );
      // 2.1 设置相机位置
      // camera.position.x = 5;
      // camera.position.y = 10;
      // camera.position.z = 10;
      // 2.1 设置相机位置简写方式：
      camera.position.set(50, 10, 10);

      // 4、创建几何体模型（立方几何体）
      var geometry = new THREE.BoxGeometry(2, 2, 2);

      // 5、创建材质（基础网格材质和法线网格材质）
      // 5.1 创建基础网格材质
      var materialBasic = new THREE.MeshBasicMaterial({
          color: 0xffffff, // 白色
          // color: 0x00ff00, // 绿色
          wireframe: true //是否将几何体渲染为线框，默认值为false（即渲染为平面多边形）
      });
      // 5.2 创建法线网格材质
      var materialNormal = new THREE.MeshLambertMaterial();

      // 6、创建多种网格（因为有多个材质）
      // 第一个参数是几何模型，第二参数是材质
      var cube = createMultiMaterialObject(geometry, [
          materialBasic,
          materialNormal
      ]);

      // 6.1、将网格添加到场景中
      scene.add(cube);

      // 6.2 让相机 看向（对着）物体（拍摄对象）的位置（默认状态下，相机将指向三维坐标系的原点。）
      camera.lookAt(cube.position);

      // // 7、创建光源
      // var spotLight = new THREE.SpotLight(0xffffff,0.6);
      // // 7.1 设置光源位置
      // spotLight.position.set(0, 200, 0);
      // // 7.2 设置光源照射的强度，默认值为 1
      // spotLight.intensity = 0.382;
      // // 7.3 将光源添加到场景中
      // scene.add(spotLight);

      // //改为平行光
      // var dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
      // //光源等位置
      // dirLight.position.set(0, 20, 20)
      // //可以产生阴影
      // dirLight.castShadow = true
      // dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024)
      // scene.add(dirLight)

      //设置从上至下的环境光,包括天空光线和地面光的反射
      let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.1);
      hemiLight.color.setHSL(0.6, 0.6, 0.6);
      hemiLight.groundColor.setHSL(0.1, 1, 0.4);
      hemiLight.position.set(0, 50, 0);
      scene.add(hemiLight);

      //设置直线光
      let dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
      dirLight.color.setHSL(0.1, 1, 0.95);
      dirLight.position.set(-10, 100, 50);
      dirLight.position.multiplyScalar(100);

      // 8、为了方便观察3D图像，添加三维坐标系对象
      var axes = new THREE.AxesHelper(6);
      scene.add(axes);

      // 9、 结合场景和相机进行渲染，即用摄像机拍下此刻的场景
      renderer.render(scene, camera);
      this.scene = scene;
      this.camera = camera;
      this.renderer = renderer;
      this.cube = cube;

      

      // const hemLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6)
      // hemLight.position.set(0, 48, 0)
      // scene.add(hemLight)


      // function animate() {
      //   controls.update()
      //   renderer.render(scene, camera)
      //   requestAnimationFrame(animate)

      //   if (resizeRendererToDisplaySize(renderer)) {
      //     const canvas = renderer.domElement
      //     camera.aspect = canvas.clientWidth / canvas.clientHeight
      //     camera.updateProjectionMatrix()
      //   }
      // }
      // animate()
    },
    
  },
}
</script>

<style scoped>
#three {
  /* width: 100%;
  height: 100%; */
}
</style>