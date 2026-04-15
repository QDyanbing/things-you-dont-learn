import {
  Alert,
  Anchor,
  Card,
  Col,
  Divider,
  Row,
  Table,
  Tabs,
  Typography,
  type TableColumnsType,
  type TabsProps,
} from 'antd';

const { Title, Paragraph, Text } = Typography;

interface OptionRow {
  key: string;
  name: string;
  description: string;
  type: string;
  defaultValue: string;
}

interface MethodRow {
  key: string;
  name: string;
  description: string;
  signature: string;
  returns: string;
}

interface EventRow {
  key: string;
  name: string;
  description: string;
  callback: string;
}

interface FieldRow {
  key: string;
  name: string;
  description: string;
  type: string;
}

interface StatusRow {
  key: string;
  value: string;
  description: string;
}

interface AdapterRow {
  key: string;
  method: string;
  description: string;
  signature: string;
  required: string;
}

interface IntegrationRow {
  key: string;
  scenario: string;
  recommendation: string;
  location: string;
}

const optionRows: OptionRow[] = [
  {
    key: 'adapter',
    name: 'adapter',
    description: '上传协议适配器。负责创建上传任务、上传分片、完成上传等和后端的交互。',
    type: 'UploadAdapter<TServerContext, TResult>',
    defaultValue: '-',
  },
  {
    key: 'partSize',
    name: 'partSize',
    description: '每个分片的字节大小。会影响请求数、失败重试粒度和整体吞吐。',
    type: 'number',
    defaultValue: '5 * 1024 * 1024',
  },
  {
    key: 'concurrency',
    name: 'concurrency',
    description: '并发上传的分片数量。',
    type: 'number',
    defaultValue: '3',
  },
  {
    key: 'autoComplete',
    name: 'autoComplete',
    description: '全部分片成功后，是否自动调用 completeUpload。',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'verifyRemotePartsOnStart',
    name: 'verifyRemotePartsOnStart',
    description: '开始上传时是否主动向服务端确认已上传分片，用于断点续传校验。',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'cleanupCheckpointWhenCompleted',
    name: 'cleanupCheckpointWhenCompleted',
    description: '上传完成后是否清理本地断点记录。',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'enableChunkHash',
    name: 'enableChunkHash',
    description: '是否为每个分片计算 hash，可用于服务端校验和秒传增强。',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    key: 'checkpointStore',
    name: 'checkpointStore',
    description: '断点记录存储策略。默认使用 localStorage，也可以自行接 IndexedDB。',
    type: 'UploadCheckpointStore<TServerContext>',
    defaultValue: 'new LocalStorageCheckpointStore()',
  },
  {
    key: 'hashStrategy',
    name: 'hashStrategy',
    description: '文件 hash 计算策略。',
    type: 'FileHashStrategy',
    defaultValue: 'new SampledFileHashStrategy()',
  },
  {
    key: 'chunkHashStrategy',
    name: 'chunkHashStrategy',
    description: '分片 hash 计算策略。',
    type: 'ChunkHashStrategy',
    defaultValue: 'new Sha256ChunkHashStrategy()',
  },
  {
    key: 'retry',
    name: 'retry',
    description: '失败重试策略，支持最大尝试次数、指数退避、最大延迟和抖动。',
    type: 'Partial<UploadRetryPolicy>',
    defaultValue: '{ maxAttempts: 3, baseDelayMs: 1000, factor: 2 }',
  },
  {
    key: 'progressWeights',
    name: 'progressWeights',
    description: '综合进度里 hash 阶段和上传阶段的权重。',
    type: '{ hash?: number; upload?: number }',
    defaultValue: '{ hash: 0.1, upload: 0.9 }',
  },
];

const methodRows: MethodRow[] = [
  {
    key: 'prepare',
    name: 'prepare',
    description: '预处理文件，计算文件 hash，恢复本地 checkpoint。',
    signature: 'prepare(file: File)',
    returns: 'Promise<UploadSnapshot<TResult, TServerContext>>',
  },
  {
    key: 'start',
    name: 'start',
    description: '开始上传。可传 file，也可在 prepare 之后直接调用。',
    signature: 'start(file?: File)',
    returns: 'Promise<TResult | undefined>',
  },
  {
    key: 'resume',
    name: 'resume',
    description: '继续一个处于 paused 状态的上传任务。',
    signature: 'resume()',
    returns: 'Promise<TResult | undefined>',
  },
  {
    key: 'pause',
    name: 'pause',
    description: '暂停当前上传，终止进行中的分片请求。',
    signature: 'pause()',
    returns: 'Promise<UploadSnapshot<TResult, TServerContext>>',
  },
  {
    key: 'cancel',
    name: 'cancel',
    description: '取消上传，并按需删除本地 checkpoint。',
    signature: 'cancel(options?: { removeCheckpoint?: boolean })',
    returns: 'Promise<UploadSnapshot<TResult, TServerContext>>',
  },
  {
    key: 'getSnapshot',
    name: 'getSnapshot',
    description: '获取当前快照。',
    signature: 'getSnapshot()',
    returns: 'UploadSnapshot<TResult, TServerContext>',
  },
  {
    key: 'on',
    name: 'on',
    description: '订阅上传事件。',
    signature: "on(eventName, listener)",
    returns: '() => void',
  },
  {
    key: 'destroy',
    name: 'destroy',
    description: '销毁实例，移除事件并中断进行中的任务。',
    signature: 'destroy()',
    returns: 'void',
  },
];

const eventRows: EventRow[] = [
  {
    key: 'snapshot',
    name: 'snapshot',
    description: '任意快照变化都会触发，适合直接驱动 UI。',
    callback: '(snapshot: UploadSnapshot<TResult, TServerContext>) => void',
  },
  {
    key: 'statusChange',
    name: 'statusChange',
    description: '状态流转时触发。',
    callback: '(snapshot: UploadSnapshot<TResult, TServerContext>) => void',
  },
  {
    key: 'progress',
    name: 'progress',
    description: '进度、速度、剩余时间变化时触发。',
    callback: '(snapshot: UploadSnapshot<TResult, TServerContext>) => void',
  },
  {
    key: 'chunkStart',
    name: 'chunkStart',
    description: '某个分片开始上传。',
    callback: '({ chunk, snapshot }) => void',
  },
  {
    key: 'chunkProgress',
    name: 'chunkProgress',
    description: '某个分片的上传进度变化。',
    callback: '({ chunk, progress, snapshot }) => void',
  },
  {
    key: 'chunkSuccess',
    name: 'chunkSuccess',
    description: '某个分片上传成功。',
    callback: '({ chunk, snapshot }) => void',
  },
  {
    key: 'chunkRetry',
    name: 'chunkRetry',
    description: '某个分片上传失败，将要按退避策略重试。',
    callback: '({ chunk, attempt, delayMs, error, snapshot }) => void',
  },
  {
    key: 'pause',
    name: 'pause',
    description: '调用 pause 后触发。',
    callback: '(snapshot: UploadSnapshot<TResult, TServerContext>) => void',
  },
  {
    key: 'resume',
    name: 'resume',
    description: '调用 resume 后成功进入续传流程时触发。',
    callback: '(snapshot: UploadSnapshot<TResult, TServerContext>) => void',
  },
  {
    key: 'success',
    name: 'success',
    description: '上传全部完成时触发。',
    callback: '(snapshot: UploadSnapshot<TResult, TServerContext>) => void',
  },
  {
    key: 'error',
    name: 'error',
    description: '上传流程失败时触发。',
    callback: '({ error, snapshot }) => void',
  },
];

const snapshotRows: FieldRow[] = [
  { key: 'status', name: 'status', description: '当前上传状态。', type: 'UploadStatus' },
  { key: 'file', name: 'file', description: '当前选中的原始 File 对象。', type: 'File | undefined' },
  { key: 'fileIdentity', name: 'fileIdentity', description: '文件身份信息，用于断点记录定位。', type: 'UploadFileIdentity | undefined' },
  { key: 'fileHash', name: 'fileHash', description: '文件 hash。', type: 'string | undefined' },
  { key: 'uploadId', name: 'uploadId', description: '服务端上传任务标识。', type: 'string | undefined' },
  { key: 'partSize', name: 'partSize', description: '当前分片大小。', type: 'number' },
  { key: 'totalParts', name: 'totalParts', description: '总分片数。', type: 'number' },
  { key: 'uploadedPartNumbers', name: 'uploadedPartNumbers', description: '已完成上传的分片编号。', type: 'number[]' },
  { key: 'pendingPartNumbers', name: 'pendingPartNumbers', description: '待上传分片编号。', type: 'number[]' },
  { key: 'completedParts', name: 'completedParts', description: '已完成分片完整记录。', type: 'UploadPartRecord[]' },
  { key: 'progress', name: 'progress', description: '进度信息集合。', type: 'UploadProgressState' },
  { key: 'flags', name: 'flags', description: '断点续传、秒传等标识位。', type: 'UploadFlags' },
  { key: 'serverContext', name: 'serverContext', description: '适配器透传的服务端上下文。', type: 'TServerContext | undefined' },
  { key: 'result', name: 'result', description: '上传成功后的最终结果。', type: 'TResult | undefined' },
  { key: 'error', name: 'error', description: '最近一次错误信息。', type: 'UploadErrorInfo | undefined' },
  { key: 'startedAt', name: 'startedAt', description: '任务开始时间。', type: 'string | undefined' },
  { key: 'updatedAt', name: 'updatedAt', description: '快照最近更新时间。', type: 'string | undefined' },
  { key: 'completedAt', name: 'completedAt', description: '任务完成时间。', type: 'string | undefined' },
];

const progressRows: FieldRow[] = [
  { key: 'hashingPercent', name: 'hashingPercent', description: '文件 hash 计算进度。', type: 'number' },
  { key: 'uploadPercent', name: 'uploadPercent', description: '分片上传进度。', type: 'number' },
  { key: 'overallPercent', name: 'overallPercent', description: '综合进度。', type: 'number' },
  { key: 'uploadedBytes', name: 'uploadedBytes', description: '已上传字节数，含进行中的分片进度。', type: 'number' },
  { key: 'confirmedUploadedBytes', name: 'confirmedUploadedBytes', description: '服务端已确认完成的字节数。', type: 'number' },
  { key: 'totalBytes', name: 'totalBytes', description: '总字节数。', type: 'number' },
  { key: 'speedBps', name: 'speedBps', description: '实时上传速度，单位 bytes/s。', type: 'number' },
  { key: 'remainingBytes', name: 'remainingBytes', description: '剩余待上传字节数。', type: 'number' },
  { key: 'estimatedRemainingMs', name: 'estimatedRemainingMs', description: '预计剩余时间。', type: 'number | null' },
];

const flagRows: FieldRow[] = [
  { key: 'resumedFromCheckpoint', name: 'resumedFromCheckpoint', description: '是否命中本地 checkpoint。', type: 'boolean' },
  { key: 'resumedFromRemote', name: 'resumedFromRemote', description: '是否命中服务端断点续传。', type: 'boolean' },
  { key: 'instantUpload', name: 'instantUpload', description: '是否命中秒传。', type: 'boolean' },
];

const statusRows: StatusRow[] = [
  { key: 'idle', value: 'idle', description: '初始状态。' },
  { key: 'hashing', value: 'hashing', description: '正在计算文件 hash。' },
  { key: 'ready', value: 'ready', description: '文件预处理完成，可以开始上传。' },
  { key: 'uploading', value: 'uploading', description: '正在上传分片。' },
  { key: 'paused', value: 'paused', description: '已暂停，可继续恢复。' },
  { key: 'completed', value: 'completed', description: '上传全部完成。' },
  { key: 'error', value: 'error', description: '上传失败。' },
  { key: 'canceled', value: 'canceled', description: '上传已取消。' },
];

const adapterRows: AdapterRow[] = [
  {
    key: 'createUploadSession',
    method: 'createUploadSession',
    description: '创建上传任务，返回 uploadId、已上传分片、秒传结果或服务端上下文。',
    signature: 'CreateUploadSessionInput -> Promise<CreateUploadSessionResult>',
    required: '是',
  },
  {
    key: 'listUploadedParts',
    method: 'listUploadedParts',
    description: '查询服务端已上传分片，主要用于断点续传时校验。',
    signature: 'ListUploadedPartsInput -> Promise<UploadPartRecord[]>',
    required: '否',
  },
  {
    key: 'uploadPart',
    method: 'uploadPart',
    description: '上传单个分片。',
    signature: 'UploadPartInput -> Promise<UploadPartResult>',
    required: '是',
  },
  {
    key: 'completeUpload',
    method: 'completeUpload',
    description: '全部分片完成后执行服务端合并。',
    signature: 'CompleteUploadInput -> Promise<CompleteUploadResult>',
    required: '否',
  },
  {
    key: 'abortUpload',
    method: 'abortUpload',
    description: '取消上传任务时，通知服务端做清理。',
    signature: 'AbortUploadInput -> Promise<void>',
    required: '否',
  },
];

const integrationRows: IntegrationRow[] = [
  {
    key: 'bearer',
    scenario: 'Bearer Token / JWT',
    recommendation: '在 createDemoUploadAdapter({ apiClientOptions }) 中通过 headers 注入 Authorization。',
    location: 'apiClientOptions.headers',
  },
  {
    key: 'cookie',
    scenario: 'Cookie / Session',
    recommendation: '将 credentials 设为 include，让浏览器自动携带 Session Cookie。',
    location: 'apiClientOptions.credentials',
  },
  {
    key: 'refresh',
    scenario: '401 后刷新登录态',
    recommendation: '在 onUnauthorized 中执行 refresh token，成功后返回 true 触发一次自动重试。',
    location: 'apiClientOptions.onUnauthorized',
  },
];

const basicCode = `import { LargeFileUploader } from '@/utils/large-file-upload';
import { createUploadAdapter } from './adapter';

const uploader = new LargeFileUploader({
  adapter: createUploadAdapter(),
  partSize: 8 * 1024 * 1024,
  concurrency: 4,
});

await uploader.prepare(file);
await uploader.start();`;

const reactCode = `const uploaderRef = useRef(
  new LargeFileUploader({
    adapter: createUploadAdapter(),
    partSize: 8 * 1024 * 1024,
    concurrency: 4,
  }),
);

useEffect(() => {
  const off = uploaderRef.current.on('snapshot', setSnapshot);
  return () => {
    off();
    uploaderRef.current.destroy();
  };
}, []);

async function handleFile(file: File) {
  await uploaderRef.current.prepare(file);
}

async function handleStart() {
  await uploaderRef.current.start();
}`;

const vueCode = `const snapshot = ref();

const uploader = new LargeFileUploader({
  adapter: createUploadAdapter(),
  partSize: 8 * 1024 * 1024,
  concurrency: 4,
});

const off = uploader.on('snapshot', (nextSnapshot) => {
  snapshot.value = nextSnapshot;
});

async function handleFile(file: File) {
  await uploader.prepare(file);
}

async function handleStart() {
  await uploader.start();
}

onBeforeUnmount(() => {
  off();
  uploader.destroy();
});`;

const adapterCode = `import type { UploadAdapter } from '@/utils/large-file-upload';

interface ServerContext {
  upload: {
    uploadId: string;
    bucket: string;
  };
}

interface UploadResult {
  fileUrl: string;
}

export const adapter: UploadAdapter<ServerContext, UploadResult> = {
  async createUploadSession(input) {
    const response = await api.createUpload(input);
    return {
      uploadId: response.uploadId,
      uploadedParts: response.uploadedParts,
      serverContext: {
        upload: response,
      },
    };
  },

  async uploadPart(input) {
    const response = await api.uploadPart({
      uploadId: input.uploadId,
      partNumber: input.chunk.partNumber,
      blob: input.blob,
      onProgress: input.onProgress,
    });

    return {
      part: response.part,
      serverContext: input.serverContext,
    };
  },

  async completeUpload(input) {
    const response = await api.completeUpload(input.uploadId, input.completedParts);
    return {
      result: {
        fileUrl: response.fileUrl,
      },
    };
  },
};`;

const authCode = `const uploader = new LargeFileUploader({
  adapter: createDemoUploadAdapter({
    apiClientOptions: {
      headers: async () => ({
        Authorization: \`Bearer \${await getAccessToken()}\`,
      }),
      credentials: 'omit',
      onUnauthorized: async () => {
        await refreshToken();
        return true;
      },
    },
  }),
  partSize: 8 * 1024 * 1024,
});`;

const typeCode = `type UploadSnapshot<TResult = unknown, TServerContext = unknown> = {
  status: UploadStatus;
  fileHash?: string;
  uploadId?: string;
  partSize: number;
  totalParts: number;
  uploadedPartNumbers: number[];
  pendingPartNumbers: number[];
  completedParts: UploadPartRecord[];
  progress: UploadProgressState;
  flags: UploadFlags;
  serverContext?: TServerContext;
  result?: TResult;
  error?: UploadErrorInfo;
};`;

function CodeBlock(props: { code: string }) {
  return (
    <div
      style={{
        background: '#141414',
        border: '1px solid #303030',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <pre
        style={{
          color: '#f5f5f5',
          margin: 0,
          padding: 16,
          fontSize: 13,
          lineHeight: 1.7,
          overflowX: 'auto',
        }}
      >
        <code>{props.code}</code>
      </pre>
    </div>
  );
}

function codeCell(value: string) {
  return <Text code>{value}</Text>;
}

const optionColumns: TableColumnsType<OptionRow> = [
  { title: '参数', dataIndex: 'name', width: 220, render: codeCell },
  { title: '说明', dataIndex: 'description' },
  { title: '类型', dataIndex: 'type', width: 320, render: codeCell },
  { title: '默认值', dataIndex: 'defaultValue', width: 280, render: codeCell },
];

const methodColumns: TableColumnsType<MethodRow> = [
  { title: '方法', dataIndex: 'name', width: 180, render: codeCell },
  { title: '说明', dataIndex: 'description' },
  { title: '签名', dataIndex: 'signature', width: 360, render: codeCell },
  { title: '返回值', dataIndex: 'returns', width: 280, render: codeCell },
];

const eventColumns: TableColumnsType<EventRow> = [
  { title: '事件名', dataIndex: 'name', width: 180, render: codeCell },
  { title: '说明', dataIndex: 'description' },
  { title: '回调签名', dataIndex: 'callback', width: 420, render: codeCell },
];

const fieldColumns: TableColumnsType<FieldRow> = [
  { title: '字段', dataIndex: 'name', width: 220, render: codeCell },
  { title: '说明', dataIndex: 'description' },
  { title: '类型', dataIndex: 'type', width: 320, render: codeCell },
];

const statusColumns: TableColumnsType<StatusRow> = [
  { title: '值', dataIndex: 'value', width: 180, render: codeCell },
  { title: '说明', dataIndex: 'description' },
];

const adapterColumns: TableColumnsType<AdapterRow> = [
  { title: '方法', dataIndex: 'method', width: 220, render: codeCell },
  { title: '说明', dataIndex: 'description' },
  { title: '签名', dataIndex: 'signature', width: 360, render: codeCell },
  { title: '必选', dataIndex: 'required', width: 120, render: codeCell },
];

const integrationColumns: TableColumnsType<IntegrationRow> = [
  { title: '场景', dataIndex: 'scenario', width: 220 },
  { title: '推荐做法', dataIndex: 'recommendation' },
  { title: '接入位置', dataIndex: 'location', width: 280, render: codeCell },
];

const demoItems: TabsProps['items'] = [
  {
    key: 'basic',
    label: 'Basic',
    children: <CodeBlock code={basicCode} />,
  },
  {
    key: 'react',
    label: 'React',
    children: <CodeBlock code={reactCode} />,
  },
  {
    key: 'vue',
    label: 'Vue',
    children: <CodeBlock code={vueCode} />,
  },
  {
    key: 'adapter',
    label: 'Adapter',
    children: <CodeBlock code={adapterCode} />,
  },
  {
    key: 'auth',
    label: 'Auth',
    children: <CodeBlock code={authCode} />,
  },
];

export function LargeFileUploaderDocs() {
  return (
    <Card title="LargeFileUploader" bordered>
      <Row gutter={[32, 32]} align="top">
        <Col xs={24} xl={18}>
          <div id="when-to-use">
            <Title level={2}>何时使用</Title>
            <Paragraph>
              需要在前端完整控制大文件上传流程时使用，例如：
            </Paragraph>
            <Paragraph>1. 文件需要分片上传。</Paragraph>
            <Paragraph>2. 需要展示上传进度、速度、预计剩余时间。</Paragraph>
            <Paragraph>3. 需要支持暂停、恢复、刷新后继续。</Paragraph>
            <Paragraph>4. 需要支持秒传或服务端断点续传。</Paragraph>
            <Paragraph>5. 需要同时兼容 React、Vue 或其他框架。</Paragraph>
            <Alert
              type="info"
              showIcon
              message="设计目标"
              description="核心能力全部放在 TypeScript class 中，界面层只做状态订阅和交互触发。"
            />
          </div>

          <Divider />

          <div id="examples">
            <Title level={2}>代码演示</Title>
            <Tabs items={demoItems} />
          </div>

          <Divider />

          <div id="api">
            <Title level={2}>API</Title>

            <Title level={3}>Constructor</Title>
            <Paragraph>
              <Text code>new LargeFileUploader(options)</Text>
            </Paragraph>
            <Table<OptionRow>
              bordered
              size="small"
              pagination={false}
              rowKey="key"
              columns={optionColumns}
              dataSource={optionRows}
              scroll={{ x: 1200 }}
            />

            <Title level={3} style={{ marginTop: 32 }}>
              Methods
            </Title>
            <Table<MethodRow>
              bordered
              size="small"
              pagination={false}
              rowKey="key"
              columns={methodColumns}
              dataSource={methodRows}
              scroll={{ x: 1280 }}
            />

            <Title level={3} style={{ marginTop: 32 }}>
              Events
            </Title>
            <Table<EventRow>
              bordered
              size="small"
              pagination={false}
              rowKey="key"
              columns={eventColumns}
              dataSource={eventRows}
              scroll={{ x: 1280 }}
            />
          </div>

          <Divider />

          <div id="snapshot">
            <Title level={2}>UploadSnapshot</Title>
            <Paragraph>
              所有 UI 建议直接绑定 <Text code>UploadSnapshot</Text>，而不是自己拆一套额外状态。
            </Paragraph>
            <CodeBlock code={typeCode} />

            <Title level={3} style={{ marginTop: 24 }}>
              Snapshot Fields
            </Title>
            <Table<FieldRow>
              bordered
              size="small"
              pagination={false}
              rowKey="key"
              columns={fieldColumns}
              dataSource={snapshotRows}
              scroll={{ x: 1100 }}
            />

            <Title level={3} style={{ marginTop: 32 }}>
              progress
            </Title>
            <Table<FieldRow>
              bordered
              size="small"
              pagination={false}
              rowKey="key"
              columns={fieldColumns}
              dataSource={progressRows}
              scroll={{ x: 1100 }}
            />

            <Title level={3} style={{ marginTop: 32 }}>
              flags
            </Title>
            <Table<FieldRow>
              bordered
              size="small"
              pagination={false}
              rowKey="key"
              columns={fieldColumns}
              dataSource={flagRows}
              scroll={{ x: 980 }}
            />

            <Title level={3} style={{ marginTop: 32 }}>
              status
            </Title>
            <Table<StatusRow>
              bordered
              size="small"
              pagination={false}
              rowKey="key"
              columns={statusColumns}
              dataSource={statusRows}
              scroll={{ x: 680 }}
            />
          </div>

          <Divider />

          <div id="adapter">
            <Title level={2}>UploadAdapter</Title>
            <Paragraph>
              <Text code>LargeFileUploader</Text> 不直接绑定任何后端协议，所有网络细节都通过
              <Text code> UploadAdapter </Text>
              接入。
            </Paragraph>
            <Table<AdapterRow>
              bordered
              size="small"
              pagination={false}
              rowKey="key"
              columns={adapterColumns}
              dataSource={adapterRows}
              scroll={{ x: 1180 }}
            />
            <Alert
              style={{ marginTop: 16 }}
              type="warning"
              showIcon
              message="建议"
              description="如果你的后端已经支持 uploadId、查询已上传分片、complete 合并接口，那么前端通常只需要实现一层很薄的 adapter。"
            />
          </div>

          <Divider />

          <div id="auth">
            <Title level={2}>鉴权接入</Title>
            <Paragraph>
              正常业务里的上传请求通常不是匿名接口。推荐把登录态逻辑放在
              <Text code> createDemoUploadAdapter({`{ apiClientOptions }`}) </Text>
              这一层，而不是散落在每个上传方法里。
            </Paragraph>
            <Table<IntegrationRow>
              bordered
              size="small"
              pagination={false}
              rowKey="key"
              columns={integrationColumns}
              dataSource={integrationRows}
              scroll={{ x: 980 }}
            />
          </div>
        </Col>

        <Col xs={0} xl={6}>
          <div style={{ position: 'sticky', top: 88 }}>
            <Card size="small" title="目录">
              <Anchor
                affix={false}
                items={[
                  { key: 'when-to-use', href: '#when-to-use', title: '何时使用' },
                  { key: 'examples', href: '#examples', title: '代码演示' },
                  { key: 'api', href: '#api', title: 'API' },
                  { key: 'snapshot', href: '#snapshot', title: 'UploadSnapshot' },
                  { key: 'adapter', href: '#adapter', title: 'UploadAdapter' },
                  { key: 'auth', href: '#auth', title: '鉴权接入' },
                ]}
              />
            </Card>
          </div>
        </Col>
      </Row>
    </Card>
  );
}
