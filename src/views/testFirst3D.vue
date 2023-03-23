<template>
  <div>
    <canvas id="three"></canvas>
  </div>
</template>

<script>
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export default {
  mounted() {
    this.initThree()
  },
  methods: {
    initThree() {
      const scene = new THREE.Scene()
      scene.background = new THREE.Color('#eee')
      scene.fog = new THREE.Fog('#eee', 20, 100)

      const canvas = document.querySelector('#three')
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
      renderer.shadowMap.enabled = true

      const camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      )
      camera.position.z = 10

      const gltfLoader = new GLTFLoader();
      let model,clone1,clone2;
      gltfLoader.load('/static/3Dmodel/seraphine/scene.gltf', (gltf) => {
        model = gltf.scene
        //遍历模型每部分
        model.traverse((o) => {
          //将图片作为纹理加载
          let explosionTexture = new THREE.TextureLoader().load(
            '/static/3Dmodel/seraphine/textures/Capybara_mat_baseColor.png'
          )
          //调整纹理图的方向
          explosionTexture.flipY = false
          //将纹理图生成基础网格材质(MeshBasicMaterial)
          const material = new THREE.MeshBasicMaterial({
            map: explosionTexture,
          })
          //给模型每部分上材质
          o.material = material
          if (o.isMesh) {
            o.castShadow = true
            o.receiveShadow = true
          }
        });
        clone1 = model.clone();
        clone2 = model.clone();
        scene.add(model);
        scene.add(clone1);
        scene.add(clone2);
        changeCamera();
      })

      const hemLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6)
      hemLight.position.set(0, 48, 0)
      scene.add(hemLight)

      const dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
      //光源等位置
      dirLight.position.set(-10, 8, -5)
      //可以产生阴影
      dirLight.castShadow = true
      dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024)
      scene.add(dirLight)

      let floorGeometry = new THREE.PlaneGeometry(8000, 8000)
      let floorMaterial = new THREE.MeshPhongMaterial({
        color: 0x857ebb,
        shininess: 0,
      })

      let floor = new THREE.Mesh(floorGeometry, floorMaterial)
      floor.rotation.x = -0.5 * Math.PI
      floor.receiveShadow = true
      floor.position.y = -0.001
      scene.add(floor)

      const controls = new OrbitControls(camera, renderer.domElement)
      // controls.autoRotate = true;
      controls.enableDamping = true

      function animate() {
        controls.update()
        renderer.render(scene, camera)
        requestAnimationFrame(animate)

        if (resizeRendererToDisplaySize(renderer)) {
          const canvas = renderer.domElement
          camera.aspect = canvas.clientWidth / canvas.clientHeight
          camera.updateProjectionMatrix()
        }
      }
      animate()

      function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement
        var width = window.innerWidth
        var height = window.innerHeight
        var canvasPixelWidth = canvas.width / window.devicePixelRatio
        var canvasPixelHeight = canvas.height / window.devicePixelRatio

        const needResize =
          canvasPixelWidth !== width || canvasPixelHeight !== height
        if (needResize) {
          renderer.setSize(width, height, false)
        }
        return needResize
      }
      
      let tempNumMax = 1000;
      let tempNum = 0;
      let zOver0 = 1;
      let speed = 10;
      let r = 1;
      let x = 1;
      let y = 1;
      let z = 1;
      function changeCamera(x,y,z) {
        // tempNum++;
        // let zOver0 = 1;
        // if (tempNum > tempNumMax*2) {
        //   tempNum = 0;
        // }
        // if(tempNum > tempNumMax){
        //   zOver0 = -1;
        //   tempNum -= tempNumMax;
        // }
        // else{
        //   zOver0 = 1;
        // }
        // let r = 1;
        // let x = 1 - (tempNum/500);
        // let z = Math.sqrt(Math.pow(r,2)-Math.pow(x,2));
        // z*=zOver0;
        // camera.position.set(x,1,z);
        tempNum++;
        zOver0 = 1;
        if (tempNum > tempNumMax) {
          tempNum = 0;
        }
        r = 1;
        x = (tempNum/1000)*speed;
        y = 1;
        z = 1;
        // let ca_x = Math.sqrt(Math.pow(2,2)-Math.pow(x,2));
        let angle = tempNum/360 * speed;
        let radius = 2;
        let ca_x = radius * Math.sin(angle);
        let ca_z = radius * Math.cos(angle);
        camera.position.set(ca_x,3,ca_z);
        model.position.set(0,2-x,0);
        clone1.position.set(2-x,0,0);
        clone2.position.set(0,0,2-x);
        camera.lookAt(0,0,0);
        // model.position.x = x;
        // clone1.position.x = x-1;
        // clone2.position.x = x-2;
        // camera.lookAt(0,0,0);
        // renderer.render(scene, camera);
        requestAnimationFrame(changeCamera);
      }
      // changeCamera();
    },
    
  },
}
</script>

<style scoped>
#three {
  width: 100%;
  height: 100%;
  position: fixed;
  left: 0;
  top: 0;
}
</style>