<!-- 每个回话对应的聊天内容 -->
<script setup lang="ts">
import type { BubbleProps } from 'vue-element-plus-x/types/Bubble';
import type { BubbleListInstance } from 'vue-element-plus-x/types/BubbleList';
import type { ThinkingStatus } from 'vue-element-plus-x/types/Thinking';
import { Loading, Position } from '@element-plus/icons-vue';
import { useXStream } from 'vue-element-plus-x';
import { useRoute } from 'vue-router';
import { send } from '@/api/chat/index';
import { useChatStore } from '@/stores/modules/chat';
import { useModelStore } from '@/stores/modules/model';

type MessageItem = BubbleProps & {
  key: number;
  role: 'ai' | 'user' | 'system';
  avatar: string;
  thinkingStatus?: ThinkingStatus;
  expanded?: boolean;
};

const { startStream: _, cancel, data, error, isLoading } = useXStream();

// const BASE_URL = 'https://api.siliconflow.cn/v1/chat/completions';
// 仅供测试，请勿拿去测试其他付费模型
// const API_KEY = 'sk-vfjyscildobjnrijtcllnkhtcouidcxdgjxtldzqzeowrbga';
// const MODEL = 'THUDM/GLM-Z1-9B-0414';

const route = useRoute();
const chatStore = useChatStore();
const modelStore = useModelStore();
const inputValue = ref('帮我写一篇小米手机介绍');
const senderRef = ref<any>(null);
const bubbleItems = ref<MessageItem[]>([]);
const bubbleListRef = ref<BubbleListInstance | null>(null);
const processedIndex = ref(0);

watch(
  () => route.params?.id,
  async (_id_) => {
    if (_id_) {
      await chatStore.requestChatList(`${_id_}`);
      // 判断的当前会话id是否有聊天记录
      if (chatStore.chatMap[`${_id_}`] && chatStore.chatMap[`${_id_}`].length) {
        bubbleItems.value = chatStore.chatMap[`${_id_}`].map((item: any) => ({
          key: item.id,
          avatar:
            item.role === 'user'
              ? 'https://avatars.githubusercontent.com/u/76239030?v=4'
              : 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
          content: item.content,
          avatarSize: '32px',
          role: item.role,
          typing: false,
        }));

        // 滚动到底部
        setTimeout(() => {
          bubbleListRef.value!.scrollToBottom();
        }, 350);
      }

      const v = localStorage.getItem('chatContent');
      if (v) {
        inputValue.value = v;
        localStorage.removeItem('chatContent');
        // 发送消息
        console.log('发送消息 v', v);
        setTimeout(() => {
          startSSE();
        }, 350);
      }
    }
  },
  { immediate: true, deep: true },
);

// 封装数据处理逻辑
function handleDataChunk(chunk: string) {
  if (chunk === ' [DONE]') {
    console.log('数据接收完毕');
    // 停止打字器状态
    if (bubbleItems.value.length) {
      bubbleItems.value[bubbleItems.value.length - 1].typing = false;
    }
    cancel();
    return;
  }
  try {
    // console.log('New chunk:', JSON.parse(chunk))
    const reasoningChunk = JSON.parse(chunk).choices[0].delta.reasoning_content;
    if (reasoningChunk) {
      // 开始思考链状态
      bubbleItems.value[bubbleItems.value.length - 1].thinkingStatus = 'thinking';
      bubbleItems.value[bubbleItems.value.length - 1].loading = true;
      if (bubbleItems.value.length) {
        bubbleItems.value[bubbleItems.value.length - 1].reasoning_content += reasoningChunk;
      }
    }

    const parsedChunk = JSON.parse(chunk).choices[0].delta.content;
    if (parsedChunk) {
      // 结束 思考链状态
      bubbleItems.value[bubbleItems.value.length - 1].thinkingStatus = 'end';
      bubbleItems.value[bubbleItems.value.length - 1].loading = false;

      if (bubbleItems.value.length) {
        bubbleItems.value[bubbleItems.value.length - 1].content += parsedChunk;
      }
    }
  }
  catch (err) {
    console.error('解析数据时出错:', err);
  }
}

watch(
  data,
  () => {
    for (let i = processedIndex.value; i < data.value.length; i++) {
      const chunk = data.value[i].data;
      handleDataChunk(chunk);
      processedIndex.value++;
    }
  },
  { deep: true },
);

// 封装错误处理逻辑
function handleError(err: any) {
  console.error('Fetch error:', err);
}

async function startSSE() {
  try {
    // 添加用户输入的消息
    console.log('inputValue.value', inputValue.value);
    addMessage(inputValue.value, true);
    addMessage('', false);

    // 这里有必要调用一下 BubbleList 组件的滚动到底部 手动触发 自动滚动
    bubbleListRef.value!.scrollToBottom();

    const res = await send({
      messages: bubbleItems.value
        .filter((item: any) => item.role === 'user')
        .map((item: any) => ({
          role: item.role,
          content: item.content,
        })),
      sessionId: Number(route.params?.id),
      userId: 1,
      model: modelStore.currentModelInfo.modelName ?? '',
    });

    console.log('res', res);

    // const response = await fetch(BASE_URL, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${API_KEY}`,
    //     'Content-Type': 'application/json',
    //     'Accept': 'text/event-stream',
    //   },
    //   body: JSON.stringify({
    //     model: MODEL,
    //     messages: bubbleItems.value
    //       .filter((item: any) => item.role === 'user')
    //       .map((item: any) => ({
    //         role: item.role,
    //         content: item.content,
    //       })),
    //     stream: true,
    //   }),
    // });
    // const readableStream = response.body!;
    // // 重置状态
    // processedIndex.value = 0;
    // await startStream({ readableStream });
  }
  catch (err) {
    handleError(err);
  }
}

// 添加消息 - 维护聊天记录
function addMessage(message: string, isUser: boolean) {
  const i = bubbleItems.value.length;
  const obj: MessageItem = {
    key: i,
    avatar: isUser
      ? 'https://avatars.githubusercontent.com/u/76239030?v=4'
      : 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
    avatarSize: '48px',
    role: isUser ? 'user' : 'system',
    placement: isUser ? 'end' : 'start',
    isMarkdown: !isUser,
    variant: 'shadow',
    shape: 'corner',
    // maxWidth: '500px',
    typing: isUser ? false : { step: 2, suffix: '❤️‍🔥', interval: 80 },
    isFog: isUser ? false : { bgColor: '#FFFFFF' },
    loading: !isUser,
    content: message || '',
    reasoning_content: '',
    thinkingStatus: 'start',
  };
  bubbleItems.value.push(obj);
}

// 展开收起 事件展示
function handleChange(payload: { value: boolean; status: ThinkingStatus }) {
  console.log('value', payload.value, 'status', payload.status);
}
</script>

<template>
  <div class="chat-with-id-container">
    <div class="chat-warp">
      <div v-if="error" class="error">
        {{ error.message }}
      </div>

      <BubbleList ref="bubbleListRef" :list="bubbleItems" max-height="calc(100vh - 240px)">
        <template #header="{ item }">
          <Thinking
            v-if="item.reasoning_content"
            :content="item.reasoning_content"
            :status="item.thinkingStatus"
            class="thinking-chain-warp"
            @change="handleChange"
          />
        </template>
      </BubbleList>

      <Sender
        ref="senderRef"
        v-model="inputValue"
        class="chat-defaul-sender"
        :auto-size="{
          maxRows: 6,
          minRows: 2,
        }"
        variant="updown"
        clearable
        allow-speech
        @submit="startSSE"
      >
        <template #prefix>
          <div class="flex-1 flex items-center gap-8px flex-none w-fit overflow-hidden">
            <div
              class="flex items-center gap-4px p-10px rounded-10px cursor-pointer font-size-14px border-1px border-[rgba(0,0,0,0.08)] border-solid hover:bg-[rgba(0,0,0,.04)]"
            >
              <el-icon>
                <Paperclip />
              </el-icon>
            </div>
          </div>
        </template>

        <template #action-list>
          <div class="footer-container">
            <el-button v-if="!isLoading" type="danger" circle @click="senderRef.submit()">
              <el-icon>
                <Position />
              </el-icon>
            </el-button>
            <el-button v-if="isLoading" type="primary" @click="cancel">
              <el-icon class="is-loading">
                <Loading />
              </el-icon>
            </el-button>
          </div>
        </template>
      </Sender>
    </div>
  </div>
</template>

<style scoped lang="scss">
.chat-with-id-container {
  position: relative;
  width: 100%;
  max-width: 800px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

  .chat-warp {
    width: 100%;
    height: calc(100vh - 60px);
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    .thinking-chain-warp {
      margin-bottom: 12px;
    }
  }

  :deep() {
    .el-bubble-list {
      padding-top: 24px;
    }

    .el-bubble {
      padding: 0 12px;
      padding-bottom: 24px;
    }

    .el-typewriter {
      border-radius: 12px;
      overflow: hidden;
    }

    .markdown-body {
      background-color: transparent;
    }
  }

  .chat-defaul-sender {
    margin-bottom: 22px;
    width: 100%;
  }
}
</style>
