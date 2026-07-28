<template>
  <div class="file-main">
    <a-row justify="space-between" class="file-main__search">
      <!-- 左侧区域 -->
      <a-space wrap>
        <a-dropdown>
          <a-upload :show-file-list="false" :multiple="true" :custom-request="handleUpload">
            <template #upload-button>
              <a-button  >
                <template #icon>
                  <icon-upload />
                </template>
                <template #default>上传附件</template>
              </a-button>
            </template>
          </a-upload>
        </a-dropdown>

        <a-input-group>
          <a-input v-model="queryForm.title" placeholder="请输入文件名" allow-clear style="width: 200px" @change="search" />
          <a-button type="primary" @click="search">
            <template #icon>
              <icon-search />
            </template>
            <template #default>查询</template>
          </a-button>
          <a-tooltip content="排序">
            <a-button class="gi_hover_btn-border" @click="handleSort" style="margin-left: 5px;">
              <template #icon>
                <icon-sort-descending v-if="queryForm.sort == 'desc'"/>
                <icon-sort-ascending  v-else/>
              </template>
            </a-button>
          </a-tooltip>
        </a-input-group>
      </a-space>

      <!-- 右侧区域 -->
      <a-space wrap>
        <a-button v-if="isBatchMode" :disabled="!selectedFileIds.length" type="primary" status="danger"
          @click="handleMulDelete">
          <template #icon>
            <icon-delete />
          </template>
        </a-button>
        <a-button type="primary" @click="isBatchMode = !isBatchMode">
          <template #icon>
            <icon-select-all />
          </template>
          <template #default>{{ isBatchMode ? '取消批量' : '批量操作' }}</template>
        </a-button>
        <button-group>
          <a-tooltip content="视图">
            <a-button class="gi_hover_btn-border" @click="toggleMode">
              <template #icon>
                <icon-list v-if="mode === 'grid'" />
                <icon-apps v-else />
              </template>
            </a-button>
          </a-tooltip>
        </button-group>
      </a-space>
    </a-row>

    <!-- 文件列表-宫格模式 -->
    <a-spin id="fileMain" class="file-main__list" :loading="loading">
      <FileGrid v-show="fileList.length && mode === 'grid'" :data="fileList" :is-batch-mode="isBatchMode"
        :selected-file-ids="selectedFileIds" @click="handleClickFile" @select="handleSelectFile"
        @right-menu-click="handleRightMenuClick"></FileGrid>

      <!-- 文件列表-列表模式 -->
      <FileList v-show="fileList.length && mode === 'list'" :data="fileList" :is-batch-mode="isBatchMode"
        :selected-file-ids="selectedFileIds" @click="handleClickFile" @select="handleSelectFile" @selectClear="handleSelectClear"
        @right-menu-click="handleRightMenuClick"></FileList>

      <a-empty v-if="!fileList.length" />
    </a-spin>
    <div class="pagination">
      <a-pagination v-bind="pagination" />
    </div>
    <!--图片预览-->
    <a-image-preview-group
      v-model:visible="imgpre.show"
      v-model:current="imgpre.current"
      infinite
      :srcList="imgpre.list"
    />
    <!--重命名-->
    <a-modal v-model:visible="renameData.show" title="重命名" :footer="false" draggable unmountOnClose>
      <a-form :model="renameData.form" @submit="handleReName" auto-label-width>
        <a-form-item field="title" label="存储名称" :rules="[{required:true,message:'请填文件名称'}]" >
          <a-input v-model="renameData.form.title" allow-clear placeholder="填文件名称"/>
        </a-form-item>
        <a-form-item style="margin-top: 10px;padding-left: 100px;">
            <a-button html-type="submit" type="primary" :loading="renameData.loading">提交修改</a-button>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref,reactive ,watch,defineAsyncComponent} from 'vue';
import { Button,Message, Modal, type RequestOption } from '@arco-design/web-vue'
import {
  openFileDetailModal,
  previewFileAudioModal,
  previewFileVideoModal
} from '../../components/index'
import FileGrid from './FileGrid.vue'
import useFileManage from './useFileManage'
import { type FileItem, type FileQuery, getList} from '../../api'
import { saveFile,delFile } from '@/api/datacenter/attachment';
import { userUploadApi} from '@/api/datacenter/upfile';
import { ImageTypes,OfficeTypes,AudioTypes } from '../../file'
import { useRoute } from 'vue-router'
import { GetFullPath } from "@/utils/tool";
const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
})
const emits = defineEmits(['update:modelValue'])
const ButtonGroup=Button.Group
const FileList = defineAsyncComponent(() => import('./FileList.vue'))
const route = useRoute()
const { mode, selectedFileIds, toggleMode, addSelectedFileItem,ClearSelectedFileItem } = useFileManage()
const queryForm = reactive<FileQuery>({
  title: "",
  type: (props.modelValue&&props.modelValue?.toString() !== 'all') ? props.modelValue?.toString() : "all",
  sort: 'desc'
})
const pagination = reactive({
    showPageSize: true,
    showTotal: true,
    current: 1,
    pageSize: 30,
    pageSizeOptions: [30, 40, 50,100,120],
    total: 0,
    simple: false,
    onChange: (size: number) => {
      pagination.current = size
      search()
    },
    onPageSizeChange: (size: number) => {
      pagination.current = 1
      pagination.pageSize = size
      search()
    }
  })
const loading = ref(false)
const isBatchMode = ref(false)
//文件列表数据
const fileList = ref<any[]>([])
const search=async()=>{
  try {
      loading.value=true
      const res= await getList({...queryForm,page:pagination.current,pageSize:pagination.pageSize})
      loading.value=false
      if(res){
        fileList.value=res.items
        pagination.total=res.total
      }
    } catch (error) {
      loading.value=false
    }
}
//排序
const handleSort=()=>{
  queryForm.sort=(queryForm.sort=='desc'?'asc':'desc')
  search()
}

// 监听路由变化
watch(
  () =>props.modelValue,
  (modelValue) => {
    if (modelValue) {
      queryForm.type=modelValue
      search()
    }
  },
  {
    immediate: true
  }
)

// 点击文件
const imgpre=ref({show:false,current:0,list:[]})
const handleClickFile = (item: FileItem) => {
  if (ImageTypes.includes(item.mimetype)) {//图片
    if (item.url) {
      const imgList: string[] = fileList.value.filter((i) => ImageTypes.includes(i.mimetype)).map((a) =>  GetFullPath(a.url) || '')
      const index = imgList.findIndex((i) => i === GetFullPath(item.url))
      if (imgList.length) {
        imgpre.value={show:true,current:index,list:imgList as any}
      }
    }
  }else if (item.mimetype.indexOf('video/')>-1) {
    previewFileVideoModal(item)
  }else if (item.mimetype.indexOf('audio/')>-1) {
    previewFileAudioModal(item)
  }else{
    Message.warning('该类文件未提供在线预览功能，请鼠标右键下载插件！')
  }
}
//重命名
const renameData=ref({
  show:false,
  loading:false,
  form:{id:"",title:""},
})
const handleReName=async()=>{
  renameData.value.loading=true
  if(renameData.value.form.title){
    try {
      Message.loading({content:"提交中",id:"up",duration:0})
      await saveFile(renameData.value.form)
      Message.success({content:"提交成功",id:"up",duration:2000})
      search()
      renameData.value.show=false
    } catch (error) {
      Message.loading({content:"提交中",id:"up",duration:10})
    }
    renameData.value.loading=false
  }
}
// 右键菜单
const handleRightMenuClick = async (mode: string, fileInfo: FileItem) => {
  if (mode === 'delete') {
    Modal.warning({
      title: '提示',
      content: `是否确定删除文件[${fileInfo.title}]？`,
      hideCancel: false,
      titleAlign:"start",
      okButtonProps: { status: 'danger' },
      onOk: async () => {
        await delFile({ids:[fileInfo.id]})
        Message.success('删除成功')
        search()
      }
    })
  } else if (mode === 'rename') {//重命名
    renameData.value.show=true
    renameData.value.form.id=fileInfo.id
    renameData.value.form.title=fileInfo.title
  } else if (mode === 'detail') {
    openFileDetailModal(fileInfo)
  } else if (mode === 'download') {
    const res = await downloadByUrl({
      url: GetFullPath(fileInfo.url),
      target: '_blank',
      fileName: `${fileInfo.name}`
    } as any)
    res ? Message.success('下载成功') : Message.error('下载失败')
    search()
  }
}
// 勾选文件
const handleSelectFile = (item: FileItem) => {
  addSelectedFileItem(item)
}
// 清除勾选文件
const handleSelectClear = ( ) => {
  ClearSelectedFileItem()
}

// 批量删除
const handleMulDelete = () => {
  Modal.warning({
    title: '提示',
    content: `是否确定删除所选的${selectedFileIds.value.length}个文件？`,
    hideCancel: false,
    onOk: async () => {
      await delFile({ids:selectedFileIds.value})
      Message.success('删除成功')
      search()
    }
  })
}
// 上传
const handleUpload = (options: RequestOption) => {
  Message.loading({content:"上传中",id:"upStatus",duration:0})
  const controller = new AbortController();
  (async function requestWrap() {
    const {
      onProgress,
      onError,
      fileItem,
    } = options;
    onProgress(20);
    const onUploadProgress = (event: ProgressEvent) => {
      let percent;
      if (event.total > 0) {
        percent = (event.loaded / event.total) * 100;
      }
      onProgress(parseInt(String(percent), 10), event);
    };
    try {
      //开始手动上传
      const filename=fileItem?.name||""
      var filetype="other"
      const filearr=fileItem.name?.split(".")
      const fileend=filearr?(filearr[filearr?.length-1]).toLowerCase():""
      if(ImageTypes.includes(fileItem.file?.type||"")){
        filetype="image"
      }else if(OfficeTypes.includes(fileend)){
        filetype="file"
      }else if(AudioTypes.includes(fileend)){
        filetype="audio"
      }else if(fileend=="mp4"){
        filetype="video"
      }
      const resdata = await userUploadApi({ name: 'file', file: fileItem.file as Blob, filename,data:{pid:0,filetype:filetype}},onUploadProgress) as any;
      //更新图片
      if(resdata){
        if(resdata["code"]==0){
            if(resdata["message"]=="文件已上传"){
              fileList.value=fileList.value.filter((item)=>resdata["data"].id!=item.id)
            }
            fileList.value=[resdata["data"]].concat(fileList.value)
            Message.success({content:"上传成功",id:"upStatus",duration:2000})
        }else{
          Message.loading({content:"上传中",id:"upStatus",duration:1})
          Modal.error({
            title: '上传文件失败',
            titleAlign:"start",
            content: resdata["message"]
          });
        }
      }else{
        Message.error({content:resdata["message"],id:"upStatus",duration:2000})
      }
    } catch (error) {
      onError(error);
      Message.error({content:"上传失败",id:"upStatus",duration:2000})
    }
  })();
  return {
    abort() {
      controller.abort();
    },
  };
}
//进入界面执行
// onBeforeRouteUpdate((to) => {
//   if (!to.query.type) return
//   if (to.query.type === 'all') {
//     queryForm.type ='all'
//   } else {
//     queryForm.type = to.query.type?.toString()
//   }
//   search()
// })

// onMounted(() => {
//   search()
// })
/**
 * 根据文件url获取文件名
 * @param url 文件url
 */
 function getFileName(url: string) {
  const num = url.lastIndexOf('/') + 1
  let fileName = url.substring(num)
  // 把参数和文件名分割开
  fileName = decodeURI(fileName.split('?')[0])
  return fileName
}

/**
 * 根据文件地址下载文件
 * @param {*} sUrl
 */
 function downloadByUrl({
  url,
  target = '_blank',
  fileName
}: {
  url: string
  target?: '_self' | '_blank'
  fileName?: string
  isSameHost: boolean
}): Promise<boolean> {
  // 是否同源
  const isSameHost = url === location.host
  return new Promise<boolean>((resolve) => {
    if (isSameHost) {
      const link = document.createElement('a')
      link.href = url
      link.target = target
      if (link.download !== undefined) {
        link.download = fileName || getFileName(url)
      }
      if (document.createEvent) {
        const e = document.createEvent('MouseEvents')
        e.initEvent('click', true, true)
        link.dispatchEvent(e)
        return resolve(true)
      }
      if (!url.includes('?')) {
        url += '?download'
      }
      window.open(url, target)
      return resolve(true)
    } else {
      const elink = document.createElement('a')
      elink.href = url
      elink.target = target
      elink.download = fileName as string
      elink.style.display = 'none'
      document.body.appendChild(elink)
      elink.click()
      document.body.removeChild(elink)
    }
  })
}

</script>

<style lang="less" scoped>
.file-main {
  height: 100%;
  background: var(--color-bg-1);
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &__search {
    border-bottom: 1px dashed var(--color-border-3);
    margin: 16px 16px 0;
  }

  &__list {
    flex: 1;
    padding: 0 16px 16px;
    box-sizing: border-box;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .pagination {
    padding: 0 16px 16px;
    :deep(.arco-pagination) {
      justify-content: end;
    }
  }
}
</style>
