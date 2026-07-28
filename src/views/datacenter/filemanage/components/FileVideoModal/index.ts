import { h } from 'vue'
import { Modal } from '@arco-design/web-vue'
import ModalContent from './ModalContent.vue'
import type { FileItem } from '../../api'

export function previewFileVideoModal(data: FileItem) {
  return Modal.open({
    title: '视频播放',
    width: '650px',
    footer: false,
    draggable: true,
    bodyStyle: 'background: #000000;padding:6px 0px',
    modalStyle: {},
    content: () => h(ModalContent, { data })
  })
}
