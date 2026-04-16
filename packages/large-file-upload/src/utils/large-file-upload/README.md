# LargeFileUploader

一个框架无关的 TypeScript 大文件上传工具，采用 Class 方式封装，适合在 React、Vue 或任意前端项目中复用。

## 何时使用

需要在前端完整控制大文件上传流程时使用，例如：

1. 文件需要分片上传。
2. 需要展示上传进度、速度、预计剩余时间。
3. 需要支持暂停、恢复、刷新后继续。
4. 需要支持秒传或服务端断点续传。
5. 需要同时兼容 React、Vue 或其他框架。

## 快速开始

1. 先用 `LargeFileUploader + UploadAdapter` 建一个可复用的上传实例。
2. 把登录态和业务参数统一收敛到 `createDemoUploadAdapter({ apiClientOptions, requestData })`。
3. 根据业务场景选择固定 `partSize`、命名预设，或者 `partSizeResolver`。
4. UI 直接订阅 `snapshot`，再接上 `start / pause / retry / restart` 即可。

## 代码演示

### Basic

```ts
import { LargeFileUploader } from './index';
import { createUploadAdapter } from './adapters/createUploadAdapter';

const uploader = new LargeFileUploader({
  adapter: createUploadAdapter(),
  partSize: 8 * 1024 * 1024,
  concurrency: 4,
});

await uploader.prepare(file);
await uploader.start();
```

### React

```tsx
const uploaderRef = useRef(
  new LargeFileUploader({
    adapter: createUploadAdapter(),
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
}
```

### Vue

```ts
const snapshot = ref();

const uploader = new LargeFileUploader({
  adapter: createUploadAdapter(),
});

const off = uploader.on('snapshot', (nextSnapshot) => {
  snapshot.value = nextSnapshot;
});

async function handleFile(file: File) {
  await uploader.prepare(file);
}

onBeforeUnmount(() => {
  off();
  uploader.destroy();
});
```

## 鉴权接入

上传接口通常需要复用业务系统已有的登录态。推荐把鉴权逻辑集中放到 `createDemoUploadAdapter({ apiClientOptions })` 里，而不是分散到每个上传方法中。

| 场景 | 推荐做法 | 接入位置 |
| --- | --- | --- |
| `Bearer Token / JWT` | 通过 `headers` 动态注入 `Authorization`。 | `apiClientOptions.headers` |
| `Cookie / Session` | 将 `credentials` 设为 `include`，让浏览器自动带上 Cookie。 | `apiClientOptions.credentials` |
| `401 后刷新登录态` | 在 `onUnauthorized` 中执行 refresh token，成功后返回 `true`，请求会自动重试一次。 | `apiClientOptions.onUnauthorized` |

```ts
import { LargeFileUploader } from './index';
import { createDemoUploadAdapter } from './adapters/demoUploadAdapter';
import { createUploadApiClientOptions } from '../../api/uploads';

const uploader = new LargeFileUploader({
  adapter: createDemoUploadAdapter({
    apiClientOptions: createUploadApiClientOptions({
      auth: {
        type: 'bearer',
        getToken: getAccessToken,
      },
      headers: {
        'x-demo-upload-access': 'bearer',
      },
      onUnauthorized: async () => {
        await refreshToken();
        return true;
      },
    }),
  }),
  partSize: 8 * 1024 * 1024,
});
```

## 业务参数注入

很多上传接口除了文件本身，还会要求带上 `bizType`、`folderId`、`tenantId`、`traceId` 这类业务字段。推荐直接使用 `requestData`，而不是为此重写整套 adapter。

| 阶段 | 适合放什么 |
| --- | --- |
| `createUpload` | 业务归属、目录信息、租户信息、上传策略 |
| `uploadPart` | 链路追踪字段、灰度标记、服务端分片路由字段 |
| `completeUpload` | 合并选项、通知开关、落库标记 |

```ts
const adapter = createDemoUploadAdapter({
  apiClientOptions: createUploadApiClientOptions({
    auth: {
      type: 'bearer',
      getToken: getAccessToken,
    },
    headers: {
      'x-demo-upload-access': 'bearer',
    },
  }),
  requestData: {
    createUpload: ({ file }) => ({
      bizType: 'invoice',
      folderId: currentFolderId,
      tenantId: currentTenantId,
      originalFileName: file.name,
    }),
    uploadPart: ({ uploadId, chunk }) => ({
      traceId: `${uploadId}-part-${chunk?.partNumber}`,
    }),
    completeUpload: ({ completedParts }) => ({
      notify: true,
      completedPartCount: completedParts?.length ?? 0,
    }),
  },
});
```

## 分片大小策略

分片越小，请求数越多但失败重试粒度更细；分片越大，请求数越少，但单次失败的回滚成本更高。推荐把 `partSize` 作为兜底值，把 `partSizeResolver` 作为真实业务中的动态决策入口。

| 策略 | 适用场景 | 推荐配置 | 说明 |
| --- | --- | --- | --- |
| `固定分片` | 文件体积区间稳定，后端 multipart 规则固定。 | `partSize: 8 * 1024 * 1024` | 最容易排查问题，也方便和后端对齐限额。 |
| `均衡模式` | 既要控制请求数，也不希望单片过大导致失败重试成本高。 | `partSizeResolver: createAdaptivePartSizeResolver()` | 默认目标约 80 片，适合作为通用默认值。 |
| `吞吐优先` | 大文件、稳定网络，希望减少请求数。 | `targetChunkCount: 48, maxPartSize: 64 * 1024 * 1024` | 适合高带宽场景，但单片失败成本更高。 |
| `按业务自定义` | 租户、文件类型、风控规则不同。 | `partSizeResolver: async ({ file, fallbackPartSize }) => number` | 建议把后端上限、限流规则和文件类型一起纳入决策。 |

```ts
import {
  createPartSizePresetResolver,
  getUploadPartSizePreset,
  LargeFileUploader,
  UPLOAD_PART_SIZE_PRESETS,
} from './index';

const uploader = new LargeFileUploader({
  adapter: createUploadAdapter(),
  partSizeResolver: createPartSizePresetResolver('balanced'),
});

const throughputPreset = getUploadPartSizePreset('throughput');

console.log(UPLOAD_PART_SIZE_PRESETS.recovery.description, throughputPreset.maxPartSize);
```

## API

### Constructor

```ts
new LargeFileUploader(options)
```

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `adapter` | 上传协议适配器。负责创建上传任务、上传分片、完成上传等和后端的交互。 | `UploadAdapter<TServerContext, TResult>` | - |
| `partSize` | 每个分片的字节大小。会影响请求数、失败重试粒度和整体吞吐。 | `number` | `5 * 1024 * 1024` |
| `partSizeResolver` | 按文件动态计算分片大小。适合根据文件体积、业务限流策略或存储约束自适应调整。 | `UploadPartSizeResolver` | - |
| `concurrency` | 并发上传的分片数量。 | `number` | `3` |
| `autoComplete` | 全部分片成功后，是否自动调用 `completeUpload`。 | `boolean` | `true` |
| `verifyRemotePartsOnStart` | 开始上传时是否主动向服务端确认已上传分片，用于断点续传校验。 | `boolean` | `true` |
| `cleanupCheckpointWhenCompleted` | 上传完成后是否清理本地断点记录。 | `boolean` | `true` |
| `enableChunkHash` | 是否为每个分片计算 hash，可用于服务端校验和秒传增强。 | `boolean` | `true` |
| `checkpointStore` | 断点记录存储策略。默认使用 localStorage，也可以自行接 IndexedDB。 | `UploadCheckpointStore<TServerContext>` | `new LocalStorageCheckpointStore()` |
| `hashStrategy` | 文件 hash 计算策略。 | `FileHashStrategy` | `new SampledFileHashStrategy()` |
| `chunkHashStrategy` | 分片 hash 计算策略。 | `ChunkHashStrategy` | `new Sha256ChunkHashStrategy()` |
| `retry` | 失败重试策略，支持最大尝试次数、指数退避、最大延迟和抖动。 | `Partial<UploadRetryPolicy>` | `{ maxAttempts: 3, baseDelayMs: 1000, factor: 2 }` |
| `progressWeights` | 综合进度里 hash 阶段和上传阶段的权重。 | `{ hash?: number; upload?: number }` | `{ hash: 0.1, upload: 0.9 }` |

### Methods

| 方法 | 说明 | 签名 | 返回值 |
| --- | --- | --- | --- |
| `prepare` | 预处理文件，计算文件 hash，恢复本地 checkpoint。 | `prepare(file: File)` | `Promise<UploadSnapshot<TResult, TServerContext>>` |
| `start` | 开始上传。可传 `file`，也可在 `prepare` 之后直接调用。 | `start(file?: File)` | `Promise<TResult \| undefined>` |
| `resume` | 继续一个处于 `paused` 状态的上传任务。 | `resume()` | `Promise<TResult \| undefined>` |
| `retry` | 按当前已准备好的上下文继续重试，适合 `paused / error` 状态。 | `retry()` | `Promise<TResult \| undefined>` |
| `restart` | 清理本地 checkpoint 和远端上传状态后，对当前文件重新上传。 | `restart(options?: { removeCheckpoint?: boolean })` | `Promise<TResult \| undefined>` |
| `pause` | 暂停当前上传，终止进行中的分片请求。 | `pause()` | `Promise<UploadSnapshot<TResult, TServerContext>>` |
| `cancel` | 取消上传，并按需删除本地 checkpoint。 | `cancel(options?: { removeCheckpoint?: boolean })` | `Promise<UploadSnapshot<TResult, TServerContext>>` |
| `getSnapshot` | 获取当前快照。 | `getSnapshot()` | `UploadSnapshot<TResult, TServerContext>` |
| `on` | 订阅上传事件。 | `on(eventName, listener)` | `() => void` |
| `destroy` | 销毁实例，移除事件并中断进行中的任务。 | `destroy()` | `void` |

### Events

| 事件名 | 说明 | 回调签名 |
| --- | --- | --- |
| `snapshot` | 任意快照变化都会触发，适合直接驱动 UI。 | `(snapshot: UploadSnapshot<TResult, TServerContext>) => void` |
| `statusChange` | 状态流转时触发。 | `(snapshot: UploadSnapshot<TResult, TServerContext>) => void` |
| `progress` | 进度、速度、剩余时间变化时触发。 | `(snapshot: UploadSnapshot<TResult, TServerContext>) => void` |
| `chunkStart` | 某个分片开始上传。 | `({ chunk, snapshot }) => void` |
| `chunkProgress` | 某个分片的上传进度变化。 | `({ chunk, progress, snapshot }) => void` |
| `chunkSuccess` | 某个分片上传成功。 | `({ chunk, snapshot }) => void` |
| `chunkRetry` | 某个分片上传失败，将要按退避策略重试。 | `({ chunk, attempt, delayMs, error, snapshot }) => void` |
| `pause` | 调用 `pause` 后触发。 | `(snapshot: UploadSnapshot<TResult, TServerContext>) => void` |
| `resume` | 调用 `resume` 后成功进入续传流程时触发。 | `(snapshot: UploadSnapshot<TResult, TServerContext>) => void` |
| `success` | 上传全部完成时触发。 | `(snapshot: UploadSnapshot<TResult, TServerContext>) => void` |
| `error` | 上传流程失败时触发。 | `({ error, snapshot }) => void` |

## UploadSnapshot

```ts
type UploadSnapshot<TResult = unknown, TServerContext = unknown> = {
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
};
```

### Snapshot Fields

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| `status` | 当前上传状态。 | `UploadStatus` |
| `file` | 当前选中的原始 File 对象。 | `File \| undefined` |
| `fileIdentity` | 文件身份信息，用于断点记录定位。 | `UploadFileIdentity \| undefined` |
| `fileHash` | 文件 hash。 | `string \| undefined` |
| `uploadId` | 服务端上传任务标识。 | `string \| undefined` |
| `partSize` | 当前分片大小。 | `number` |
| `totalParts` | 总分片数。 | `number` |
| `uploadedPartNumbers` | 已完成上传的分片编号。 | `number[]` |
| `pendingPartNumbers` | 待上传分片编号。 | `number[]` |
| `completedParts` | 已完成分片完整记录。 | `UploadPartRecord[]` |
| `progress` | 进度信息集合。 | `UploadProgressState` |
| `flags` | 断点续传、秒传等标识位。 | `UploadFlags` |
| `serverContext` | 适配器透传的服务端上下文。 | `TServerContext \| undefined` |
| `result` | 上传成功后的最终结果。 | `TResult \| undefined` |
| `error` | 最近一次错误信息。 | `UploadErrorInfo \| undefined` |
| `startedAt` | 任务开始时间。 | `string \| undefined` |
| `updatedAt` | 快照最近更新时间。 | `string \| undefined` |
| `completedAt` | 任务完成时间。 | `string \| undefined` |

### progress

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| `hashingPercent` | 文件 hash 计算进度。 | `number` |
| `uploadPercent` | 分片上传进度。 | `number` |
| `overallPercent` | 综合进度。 | `number` |
| `uploadedBytes` | 已上传字节数，含进行中的分片进度。 | `number` |
| `confirmedUploadedBytes` | 服务端已确认完成的字节数。 | `number` |
| `totalBytes` | 总字节数。 | `number` |
| `speedBps` | 实时上传速度，单位 bytes/s。 | `number` |
| `remainingBytes` | 剩余待上传字节数。 | `number` |
| `estimatedRemainingMs` | 预计剩余时间。 | `number \| null` |

### flags

| 字段 | 说明 | 类型 |
| --- | --- | --- |
| `resumedFromCheckpoint` | 是否命中本地 checkpoint。 | `boolean` |
| `resumedFromRemote` | 是否命中服务端断点续传。 | `boolean` |
| `instantUpload` | 是否命中秒传。 | `boolean` |

### status

| 值 | 说明 |
| --- | --- |
| `idle` | 初始状态。 |
| `hashing` | 正在计算文件 hash。 |
| `ready` | 文件预处理完成，可以开始上传。 |
| `uploading` | 正在上传分片。 |
| `paused` | 已暂停，可继续恢复。 |
| `completed` | 上传全部完成。 |
| `error` | 上传失败。 |
| `canceled` | 上传已取消。 |

## UploadAdapter

工具内部不直接绑定任何后端接口，所有网络细节都通过 `UploadAdapter` 接入。

| 方法 | 说明 | 签名 | 必选 |
| --- | --- | --- | --- |
| `createUploadSession` | 创建上传任务，返回 uploadId、已上传分片、秒传结果或服务端上下文。 | `CreateUploadSessionInput -> Promise<CreateUploadSessionResult>` | 是 |
| `listUploadedParts` | 查询服务端已上传分片，主要用于断点续传时校验。 | `ListUploadedPartsInput -> Promise<UploadPartRecord[]>` | 否 |
| `uploadPart` | 上传单个分片。 | `UploadPartInput -> Promise<UploadPartResult>` | 是 |
| `completeUpload` | 全部分片完成后执行服务端合并。 | `CompleteUploadInput -> Promise<CompleteUploadResult>` | 否 |
| `abortUpload` | 取消上传任务时，通知服务端做清理。 | `AbortUploadInput -> Promise<void>` | 否 |

## 当前项目里的示例实现

- 核心类：`src/utils/large-file-upload/core/LargeFileUploader.ts`
- 类型定义：`src/utils/large-file-upload/types.ts`
- 本地断点存储：`src/utils/large-file-upload/persistence/LocalStorageCheckpointStore.ts`
- 示例适配器：`src/utils/large-file-upload/adapters/demoUploadAdapter.ts`
