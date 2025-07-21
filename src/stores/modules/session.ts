import type { ChatSessionVo, CreateSessionDTO, GetSessionListParams } from '@/api/session/types';
import { ChatLineRound } from '@element-plus/icons-vue';
import { defineStore } from 'pinia';
import { markRaw } from 'vue';
import { useRouter } from 'vue-router';
import {
  create_session,
  delete_session,
  get_session,
  get_session_list,
  update_session,
} from '@/api';
import { useUserStore } from './user';

export const useSessionStore = defineStore('session', () => {
  const router = useRouter();
  const userStore = useUserStore();

  // 当前选中的会话信息
  const currentSession = ref<ChatSessionVo | null>(null);
  // 设置当前会话
  const setCurrentSession = (session: ChatSessionVo | null) => {
    currentSession.value = session;
  };

  // 会话列表核心状态
  const sessionList = ref<ChatSessionVo[]>([]); // 会话数据列表
  const currentPage = ref(1); // 当前页码（从1开始）
  const pageSize = ref(25); // 每页显示数量
  const hasMore = ref(true); // 是否还有更多数据
  const isLoading = ref(false); // 全局加载状态（初始加载/刷新）
  const isLoadingMore = ref(false); // 加载更多状态（区分初始加载）

  // 创建新对话（按钮点击）
  const createSessionBtn = async () => {
    try {
      // 清空当前选中会话信息
      setCurrentSession(null);
      router.replace({ name: 'chat' });
    }
    catch (error) {
      console.error('createSessionBtn错误:', error);
    }
  };

  // 获取会话列表（核心分页方法）
  const requestSessionList = async (page: number = currentPage.value, force: boolean = false) => {
    // 如果没有token就直接清空
    if (!userStore.token) {
      sessionList.value = [];
      return;
    }

    if (!force && ((page > 1 && !hasMore.value) || isLoading.value || isLoadingMore.value))
      return;

    isLoading.value = page === 1; // 第一页时标记为全局加载
    isLoadingMore.value = page > 1; // 非第一页时标记为加载更多

    try {
      const params: GetSessionListParams = {
        userId: userStore.userInfo?.userId as number,
        pageNum: page,
        pageSize: pageSize.value,
        isAsc: 'desc',
        orderByColumn: 'createTime',
      };

      const resArr = await get_session_list(params);

      // 预处理会话分组 并添加前缀图标
      const res = processSessions(resArr.rows);

      const allSessions = new Map(sessionList.value.map(item => [item.id, item])); // 现有所有数据
      res.forEach(item => allSessions.set(item.id, { ...item })); // 更新/添加数据

      // 按服务端排序重建列表（假设分页数据是按时间倒序，第一页是最新，后续页依次递减）
      // 此处需根据接口返回的排序规则调整，假设每页数据是递增的（第一页最新，第二页次新，第三页 oldest）
      if (page === 1) {
        // 第一页是最新数据，应排在列表前面
        sessionList.value = [
          ...res, // 新的第一页数据（最新）
          ...Array.from(allSessions.values()).filter(item => !res.some(r => r.id === item.id)), // 保留未被第一页覆盖的旧数据
        ];
      }
      else {
        // 非第一页数据是更旧的数据，追加到列表末尾
        sessionList.value = [
          ...sessionList.value.filter(item => !res.some(r => r.id === item.id)), // 保留现有数据（除了被当前页更新的）
          ...res, // 追加当前页的新数据（更旧的）
        ];
      }

      // 判断是否还有更多数据（当前页数据量 < pageSize 则无更多）
      if (!force)
        hasMore.value = (res?.length || 0) === pageSize.value;
      if (!force)
        currentPage.value = page; // 仅非强制刷新时更新页码
    }
    catch (error) {
      console.error('requestSessionList错误:', error);
    }
    finally {
      isLoading.value = false;
      isLoadingMore.value = false;
    }
  };

  // 发送消息后创建新会话
  const createSessionList = async (data: Omit<CreateSessionDTO, 'id'>) => {
    if (!userStore.token) {
      router.replace({
        name: 'chatWithId',
        params: {
          id: 'not_login',
        },
      });
      return;
    }

    try {
      const res = await create_session(data);
      // 创建会话后立刻查询列表会话
      // 1. 先找到被修改会话在 sessionList 中的索引（假设 sessionList 是按服务端排序的完整列表）
      const targetIndex = sessionList.value.findIndex(session => session.id === `${res.data}`);
      // 2. 计算该会话所在的页码（页大小固定为 pageSize.value）
      const targetPage
        = targetIndex >= 0
          ? Math.floor(targetIndex / pageSize.value) + 1 // 索引从0开始，页码从1开始
          : 1; // 未找到时默认刷新第一页（可能因排序变化导致位置改变）
      // 3. 刷新目标页数据
      await requestSessionList(targetPage, true);
      // 并将当前勾选信息设置为新增的会话信息
      const newSessionRes = await get_session(`${res.data}`);
      setCurrentSession(newSessionRes.data);

      // 跳转聊天页
      router.replace({
        name: 'chatWithId',
        params: { id: `${res.data}` },
      });
    }
    catch (error) {
      console.error('createSessionList错误:', error);
    }
  };

  // 加载更多会话（供组件调用）
  const loadMoreSessions = async () => {
    if (hasMore.value)
      await requestSessionList(currentPage.value + 1);
  };

  // 更新会话（供组件调用）
  const updateSession = async (item: ChatSessionVo) => {
    try {
      await update_session(item);
      // 1. 先找到被修改会话在 sessionList 中的索引（假设 sessionList 是按服务端排序的完整列表）
      const targetIndex = sessionList.value.findIndex(session => session.id === item.id);
      // 2. 计算该会话所在的页码（页大小固定为 pageSize.value）
      const targetPage
        = targetIndex >= 0
          ? Math.floor(targetIndex / pageSize.value) + 1 // 索引从0开始，页码从1开始
          : 1; // 未找到时默认刷新第一页（可能因排序变化导致位置改变）
      // 3. 刷新目标页数据
      await requestSessionList(targetPage, true);
    }
    catch (error) {
      console.error('updateSession错误:', error);
    }
  };

  // 删除会话（供组件调用）
  const deleteSessions = async (ids: string[]) => {
    try {
      await delete_session(ids);
      // 1. 先找到被修改会话在 sessionList 中的索引（假设 sessionList 是按服务端排序的完整列表）
      const targetIndex = sessionList.value.findIndex(session => session.id === ids[0]);
      // 2. 计算该会话所在的页码（页大小固定为 pageSize.value）
      const targetPage
        = targetIndex >= 0
          ? Math.floor(targetIndex / pageSize.value) + 1 // 索引从0开始，页码从1开始
          : 1; // 未找到时默认刷新第一页（可能因排序变化导致位置改变）
      // 3. 删除 sessionList 中该索引的元素
      sessionList.value = sessionList.value.slice(0, targetIndex).concat(sessionList.value.slice(targetIndex + 1));
      // 4. 刷新目标页数据
      await requestSessionList(targetPage, true);
    }
    catch (error) {
      console.error('deleteSessions错误:', error);
    }
  };

  // 在获取会话列表后添加预处理逻辑（示例）
  function processSessions(sessions: ChatSessionVo[]) {
    const currentDate = new Date();

    return sessions.map((session) => {
      const createDate = new Date(session.createTime!);
      const diffDays = Math.floor(
        (currentDate.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // 生成原始分组键（用于排序和分组）
      let group: string;
      if (diffDays < 7) {
        group = '7 天内'; // 用数字前缀确保排序正确
      }
      else if (diffDays < 30) {
        group = '30 天内';
      }
      else {
        const year = createDate.getFullYear();
        const month = String(createDate.getMonth() + 1).padStart(2, '0');
        group = `${year}-${month}`; // 格式：2025-05
      }

      return {
        ...session,
        group, // 新增分组键字段
        prefixIcon: markRaw(ChatLineRound), // 图标为静态组件，使用 markRaw 标记为静态组件
      };
    });
  }

  return {
    // 当前选中的会话
    currentSession,
    // 设置当前会话
    setCurrentSession,
    // 列表状态
    sessionList,
    currentPage,
    pageSize,
    hasMore,
    isLoading,
    isLoadingMore,
    // 列表方法
    createSessionBtn,
    createSessionList,
    requestSessionList,
    loadMoreSessions,
    updateSession,
    deleteSessions,
  };
});
