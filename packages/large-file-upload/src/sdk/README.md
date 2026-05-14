# FileCoordinator

`FileCoordinator` 是当前 SDK 的单文件上传协调类，负责分片准备、上传调度、进度聚合和运行态查询。

## Design

- 一个实例只处理一个文件
- 多文件场景由外层自己包一层管理
- SDK 负责单文件分片、状态记录、进度聚合和取消/暂停/恢复等上传流程控制

## Usage

```ts
import { FileCoordinator } from './FileCoordinator';

const coordinator = new FileCoordinator(file, {
  concurrency: 3,
  createFileIdentity(currentFile) {
    return `biz_${currentFile.name}_${currentFile.size}`;
  },
  async uploadChunk({ chunk, chunkInfo, fileIdentity, signal, reportProgress }) {
    const formData = new FormData();

    formData.append('file', chunk);
    formData.append('fileIdentity', fileIdentity);
    formData.append('index', String(chunkInfo.index));
    reportProgress(chunk.size / 2, chunk.size);
    reportProgress(chunk.size, chunk.size);

    await fetch('/api/upload/chunk', {
      method: 'POST',
      signal,
      body: formData,
    });
  },
});
const prepareResult = await coordinator.prepare();
const restoredChunkCount = coordinator.setUploadedChunks([0, 3, 5]);
const completionRatio = coordinator.getCompletionRatio();
await coordinator.upload();
const progress = coordinator.getProgress();
const remainingBytes = progress.remainingBytes;
const statusCounts = coordinator.getChunkStatusCounts();
const hasUploadedChunks = coordinator.hasUploadedChunks();
const firstUploadedChunkIndex = coordinator.getFirstUploadedChunkIndex();
const lastUploadedChunkIndex = coordinator.getLastUploadedChunkIndex();
const queuedChunkIndexes = coordinator.getQueuedChunkIndexes();
const hasQueuedChunks = coordinator.hasQueuedChunks();
const firstQueuedChunkIndex = coordinator.getFirstQueuedChunkIndex();
const lastQueuedChunkIndex = coordinator.getLastQueuedChunkIndex();
const hasUploadingChunks = coordinator.hasUploadingChunks();
const firstUploadingChunkIndex = coordinator.getFirstUploadingChunkIndex();
const lastUploadingChunkIndex = coordinator.getLastUploadingChunkIndex();
const failedChunkIndexes = coordinator.getFailedChunkIndexes();
const firstFailedChunkIndex = coordinator.getFirstFailedChunkIndex();
const lastFailedChunkIndex = coordinator.getLastFailedChunkIndex();
const shouldShowRetry = coordinator.hasFailedChunks();
const firstChunkStatus = coordinator.getChunkStatus(0);
const firstChunkByteRange = coordinator.getChunkByteRange(0);
```

常规接入更推荐调用 `upload()`，让 SDK 按 `concurrency` 自动调度整轮上传；`uploadChunk(index)` 更适合调试、单片补传或外层已经自行管理调度队列的场景。

如果需要取消当前活跃上传，可以保留 `const uploadTask = coordinator.upload()` 返回的 Promise，再调用 `coordinator.cancel()` 中断这一轮调度。

`canCancel()` 是围绕活跃上传任务的轻量判断，适合用来控制取消按钮是否可用；真正取消时仍应调用 `cancel()`。

如果只是临时暂停，可以调用 `coordinator.pause()`；被暂停中的分片会恢复回 `PENDING`，实例状态会进入 `PAUSED`，之后可通过 `resume()` 继续。

`canPause()` 和 `canCancel()` 一样基于当前是否存在活跃上传任务判断，适合用来控制暂停按钮是否可用。

`canResume()` 是围绕 `PAUSED` 状态的轻量判断，适合用来控制恢复按钮是否可用；真正恢复时仍应调用 `resume()`。

`canUpload()` 是开始上传前的轻量判断，适合控制上传按钮；真正执行时仍应调用 `upload()`，由 SDK 内部复用或校验当前上传任务。

## API

### Constructor

```ts
new FileCoordinator(file, options)
```

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `file` | UI 选择后的单个文件对象 | `File` | - |
| `options` | 当前实例的配置项 | `FileCoordinatorOptions` | `{}` |

### FileCoordinatorOptions

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `chunkSize` | 单个分片的字节大小 | `number` | `5 * 1024 * 1024` |
| `concurrency` | 分片上传时允许同时进行的最大并发数；会在实例内部归一化为大于等于 `1` 的整数 | `number` | `1` |
| `createFileIdentity` | 自定义文件 id 计算函数；不传时会基于 `name`、`size`、`type`、`lastModified` 等元信息生成短 id | `(file: File) => FileCoordinatorFileIdentity` | 默认内置实现 |
| `uploadChunk` | 调用方注入的单分片上传函数；SDK 会把分片数据、取消信号和进度上报函数交给它，请求库、鉴权和接口结构由调用方决定 | `FileCoordinatorUploadChunkHandler` | - |

### FileCoordinatorResolvedOptions

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `chunkSize` | 当前实例最终生效的分片大小，`getOptions()` 返回的一定是归一化后的值 | `number` | - |
| `concurrency` | 当前实例最终生效的并发上传数 | `number` | - |
| `createFileIdentity` | 当前实例最终生效的文件 id 计算函数 | `(file: File) => FileCoordinatorFileIdentity` | - |
| `uploadChunk` | 当前实例最终生效的单分片上传函数 | `FileCoordinatorUploadChunkHandler \| undefined` | - |

### FileCoordinatorChunkIdentity

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `-` | 基于文件标识、分片下标和分片范围压缩生成的短 id，用来唯一标记当前分片 | `string` | - |

### FileCoordinatorChunkStatus

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `PENDING` | 分片已经准备完成，等待调用方开始上传 | `'PENDING'` | - |
| `UPLOADING` | 分片正在上传中 | `'UPLOADING'` | - |
| `SUCCESS` | 分片已经上传成功 | `'SUCCESS'` | - |
| `ERROR` | 分片上传失败 | `'ERROR'` | - |

`getPendingChunkIndexes()` 面向“下一轮仍需调度”的视角，会包含 `PENDING` 和 `ERROR`，不会把已经处于 `UPLOADING` 的分片再次返回出来。

`getRemainingChunkCount()` 使用同一套“仍需调度”口径，适合只需要数量而不关心具体下标的 UI。

`getQueuedChunkIndexes()` 面向“严格等待上传”的视角，只返回 `PENDING` 分片；如果调用方需要把失败分片也纳入下一轮调度，应继续使用 `getPendingChunkIndexes()`。

`hasQueuedChunks()` 是严格等待上传列表的布尔视角，不代表当前一定可以调用 `upload()`；上传按钮是否可用仍建议使用 `canUpload()`。

`getFirstQueuedChunkIndex()` 复用严格等待上传口径，只会从 `PENDING` 分片里返回下标最靠前的一块；没有排队分片时返回 `null`。

`getLastQueuedChunkIndex()` 同样复用严格等待上传口径，只会从 `PENDING` 分片里返回下标最后的一块；它不会把 `ERROR` 分片当作排队分片。

`getNextPendingChunkIndex()` 复用 `getPendingChunkIndexes()` 的调度口径，会从 `PENDING` 和 `ERROR` 分片里返回下标最靠前的一块。

`getUploadedChunkIndexes()` 和 `getUploadedChunkCount()` 使用同一套成功口径，只有当前状态为 `SUCCESS` 的分片会被计入。

`hasUploadedChunks()` 是成功分片列表的布尔视角，适合只需要判断是否有已完成分片的 UI，不会读取服务端断点记录。

`getFirstUploadedChunkIndex()` 复用成功分片列表的顺序，返回当前第一块 `SUCCESS` 分片的下标；如果还没有任何成功分片，则返回 `null`。

`getLastUploadedChunkIndex()` 复用成功分片列表的顺序，返回当前最后一块 `SUCCESS` 分片的下标；如果还没有任何成功分片，则返回 `null`。

`getCompletionRatio()` 也是基于 `SUCCESS` 分片数量计算，返回值范围是 `0` 到 `1`；它适合展示分片完成度，字节级百分比仍应使用 `getProgress().percent`。

和它相对的是，`getUploadingChunkIndexes()` 只会返回当前已经进入上传执行中的分片，不会包含 `PENDING`、`SUCCESS` 或 `ERROR` 状态的分片。

`hasUploadingChunks()` 是上传中分片列表的布尔视角，只看当前分片状态；是否可以取消或暂停整轮任务仍应使用 `canCancel()` 和 `canPause()`。

`getFirstUploadingChunkIndex()` 复用上传中分片列表的顺序，适合在并发上传时快速展示当前第一块正在执行的分片。

`getLastUploadingChunkIndex()` 同样复用上传中分片列表的顺序，适合观察当前并发窗口尾部正在执行的分片。

`getUploadingChunkCount()` 是上传中分片列表的数量视角，适合展示当前并发占用情况。

`getFailedChunkIndexes()` 只观察当前状态为 `ERROR` 的分片；这些分片仍会被 `getPendingChunkIndexes()` 返回，并能在下一次 `upload()` 调用里继续参与调度。

`getFirstFailedChunkIndex()` 复用失败分片列表的顺序，适合在重试入口、错误定位或日志里快速展示第一块失败分片。

`getLastFailedChunkIndex()` 同样复用失败分片列表的顺序，适合需要展示失败范围边界或最后一次失败位置的场景。

`getFailedChunkCount()` 是失败分片列表的数量视角，适合只需要展示失败数量或徽标的场景。

`getChunkStatusCounts()` 会按当前本地分片状态聚合计数，状态口径和各个 `get*ChunkIndexes()` 方法保持一致。

`hasFailedChunks()` 是 `getFailedChunkIndexes().length > 0` 的便捷判断，适合用来控制是否展示失败重试入口。

`resetUploadProgress()` 只会在当前没有活跃上传任务时生效；它不会重新切片，也不会清空 `prepare()` 生成的分片元信息，只会把分片状态和本地上传字节进度恢复到初始上传态。返回值只统计实际发生变化的分片，原本已经处于初始上传态的分片不会计入。

`canResetUploadProgress()` 复用 `resetUploadProgress()` 的保护条件，适合在 UI 上提前禁用重置入口。

`resetFailedChunks()` 是更窄的状态整理方法，只会处理当前为 `ERROR` 的分片；它同样不会主动发起上传，调用方可以在清理失败态后再次调用 `upload()`。

`getProgress()` 的 `uploadedBytes` 统计口径是：`SUCCESS` 分片按整片大小计入，`UPLOADING` 分片按最近一次 `reportProgress` 回传值计入，`PENDING` 和 `ERROR` 分片默认不计入整体进度。

`getChunkProgress(index)` 使用同一套字节统计口径，只是把范围限制在单个分片上；无效下标会返回 `null`。

`getChunkByteRange(index)` 只返回分片的起止字节和大小，适合只需要定位服务端分片范围、不需要读取分片 `Blob` 的场景。

`remainingBytes` 是基于当前本地快照派生出的 `totalBytes - uploadedBytes`，不会额外查询服务端状态。

当前上传过程中如果请求层响应了 `signal` 中断，SDK 会把被取消中的分片恢复回 `PENDING`，这样后续重新调用 `upload()` 时还能继续调度这些分片。

### FileCoordinatorChunkInfo

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `index` | 当前分片的下标，从 `0` 开始 | `number` | - |
| `chunkIdentity` | 当前分片的唯一标识 | `FileCoordinatorChunkIdentity` | - |
| `type` | 当前分片继承的文件 MIME type | `string` | - |
| `start` | 当前分片的起始字节位置，包含当前值 | `number` | - |
| `end` | 当前分片的结束字节位置，不包含当前值 | `number` | - |
| `size` | 当前分片的字节大小 | `number` | - |

### FileCoordinatorChunkByteRange

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `start` | 当前分片的起始字节位置，包含当前值 | `number` | - |
| `end` | 当前分片的结束字节位置，不包含当前值 | `number` | - |
| `size` | 当前分片的字节大小 | `number` | - |

### FileCoordinatorUploadChunkParams

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `file` | 当前实例持有的原始文件对象 | `File` | - |
| `fileIdentity` | 当前文件的唯一标识 | `FileCoordinatorFileIdentity` | - |
| `chunkInfo` | 当前准备上传的分片元信息 | `FileCoordinatorChunkInfo` | - |
| `chunk` | 当前准备上传的分片 `Blob` 数据 | `Blob` | - |
| `signal` | 由 SDK 注入的中断信号；调用方可以直接传给 `fetch`、`axios` 或其他请求库来响应取消上传 | `AbortSignal` | - |
| `reportProgress` | 由 SDK 注入的单分片进度上报函数；调用方可以在请求过程中持续回传 `loaded`，让 SDK 聚合整体上传进度 | `(loaded: number, total?: number) => void` | - |

### FileCoordinatorUploadChunkHandler

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `-` | 调用方传入的单分片上传处理函数；通常在这里接入鉴权、请求头、接口地址和表单结构 | `(params: FileCoordinatorUploadChunkParams) => Promise<void>` | - |

### FileCoordinatorProgress

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `totalBytes` | 当前文件总字节数 | `number` | - |
| `uploadedBytes` | 当前已经计入聚合进度的上传字节数 | `number` | - |
| `remainingBytes` | 当前尚未计入聚合进度的剩余字节数 | `number` | - |
| `percent` | 当前整体上传百分比，范围为 `0` 到 `100` | `number` | - |
| `chunkCount` | 当前文件分片总数 | `number` | - |
| `uploadedChunkCount` | 当前状态已经是 `SUCCESS` 的分片数量 | `number` | - |

### FileCoordinatorChunkProgress

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `index` | 当前分片下标 | `number` | - |
| `status` | 当前分片运行时状态 | `FileCoordinatorChunkStatus` | - |
| `totalBytes` | 当前分片总字节数 | `number` | - |
| `uploadedBytes` | 当前分片已经计入进度的上传字节数 | `number` | - |
| `remainingBytes` | 当前分片尚未计入进度的剩余字节数 | `number` | - |
| `percent` | 当前分片上传百分比，范围为 `0` 到 `100` | `number` | - |

### FileCoordinatorChunkStatusCounts

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `pending` | 当前状态为 `PENDING` 的分片数量 | `number` | - |
| `uploading` | 当前状态为 `UPLOADING` 的分片数量 | `number` | - |
| `success` | 当前状态为 `SUCCESS` 的分片数量 | `number` | - |
| `error` | 当前状态为 `ERROR` 的分片数量 | `number` | - |

### FileCoordinatorStatus

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `INIT` | 当前实例创建完成后的初始状态 | `'INIT'` | - |
| `PREPARING` | 进入预处理阶段，例如切片、hash、恢复本地记录等 | `'PREPARING'` | - |
| `READY` | 预处理完成，已经可以开始上传 | `'READY'` | - |
| `UPLOADING` | 正在上传文件分片 | `'UPLOADING'` | - |
| `PAUSED` | 上传已被暂停，等待继续 | `'PAUSED'` | - |
| `COMPLETING` | 分片上传完成，正在做最终完成步骤 | `'COMPLETING'` | - |
| `COMPLETED` | 上传流程已经全部完成 | `'COMPLETED'` | - |
| `CANCELED` | 上传已被主动取消 | `'CANCELED'` | - |
| `ERROR` | 上传流程发生错误 | `'ERROR'` | - |

### FileCoordinatorFileIdentity

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `-` | 默认基于 `file.name`、`file.size`、`file.type`、`file.lastModified`、目录上传相对路径等元信息压缩生成的短 id；适合当前阶段做轻量文件键，不等同于内容 hash | `string` | - |

### FileCoordinatorPrepareResult

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `fileIdentity` | 当前文件的唯一标识 | `FileCoordinatorFileIdentity` | - |
| `fileSize` | 当前文件大小，单位为字节 | `number` | - |
| `status` | 当前 prepare 完成后的实例状态 | `FileCoordinatorStatus` | - |
| `chunkCount` | 当前 prepare 生成出的分片数量 | `number` | - |
| `chunkSize` | 当前 prepare 使用的分片大小，也就是实例最终生效的归一化 `chunkSize` | `number` | - |

### Methods

| 方法 | 说明 | 返回类型 |
| --- | --- | --- |
| `getFile()` | 获取当前实例持有的原始文件对象 | `File` |
| `getFileIdentity()` | 获取当前文件的唯一标识 | `FileCoordinatorFileIdentity` |
| `getOptions()` | 获取当前实例最终生效的配置对象，其中 `chunkSize` 一定存在 | `FileCoordinatorResolvedOptions` |
| `setChunkSize(chunkSize)` | 更新当前实例生效的分片大小；会返回归一化后的值，并清空当前已准备的分片数据，把状态重置为 `INIT` | `number` |
| `getStatus()` | 获取当前实例状态 | `FileCoordinatorStatus` |
| `isPrepared()` | 判断当前实例是否已经完成分片准备；当前等价于状态是否为 `READY` | `boolean` |
| `prepare()` | 重新按当前 `chunkSize` 准备分片数据；重复调用是安全的，并发调用会复用同一轮 prepare，重建前会先清空旧分片；状态会从 `PREPARING` 进入 `READY`，新生成的分片初始状态都是 `PENDING`，并返回本次 prepare 的摘要结果 | `Promise<FileCoordinatorPrepareResult>` |
| `getChunkCount()` | 获取当前文件分片数量；在调用 `prepare()` 前默认是 `0` | `number` |
| `hasChunk(index)` | 按下标判断当前分片是否存在；`index` 需要是从 `0` 开始的非负整数；在分片不存在或尚未 `prepare()` 时返回 `false` | `boolean` |
| `getChunkStatus(index)` | 按下标获取单个分片的当前运行时状态；`index` 需要是从 `0` 开始的非负整数；在分片不存在或尚未 `prepare()` 时返回 `null` | `FileCoordinatorChunkStatus \| null` |
| `setChunkStatus(index, status)` | 按下标回写单个分片的当前运行时状态；常用于外层在开始上传、上传成功、上传失败后同步状态；分片不存在或尚未 `prepare()` 时返回 `false` | `boolean` |
| `setUploadedChunks(indexes)` | 批量把一组分片下标标记为已上传成功；适合在断点续传时恢复服务端已经确认完成的分片；无效下标会被忽略，返回成功写入的分片数量 | `number` |
| `isChunkUploaded(index)` | 判断单个分片是否已经上传完成；当前只有分片状态为 `SUCCESS` 时才会返回 `true` | `boolean` |
| `getUploadedChunkCount()` | 获取当前已经上传完成的分片数量；当前只统计状态为 `SUCCESS` 的分片 | `number` |
| `getCompletionRatio()` | 获取当前已成功分片数量占总分片数量的比例；未准备分片时返回 `0` | `number` |
| `getUploadedChunkIndexes()` | 获取当前已经上传完成的分片下标列表；当前只返回状态为 `SUCCESS` 的分片 | `number[]` |
| `hasUploadedChunks()` | 判断当前是否存在已成功上传的分片；当前只观察状态为 `SUCCESS` 的分片 | `boolean` |
| `getFirstUploadedChunkIndex()` | 获取第一块已成功上传的分片下标；还没有成功分片时返回 `null` | `number \| null` |
| `getLastUploadedChunkIndex()` | 获取最后一块已成功上传的分片下标；还没有成功分片时返回 `null` | `number \| null` |
| `getProgress()` | 获取当前文件的聚合上传进度快照；会返回总字节数、已计入进度的上传字节数、整体百分比和已完成分片数量 | `FileCoordinatorProgress` |
| `getChunkProgress(index)` | 按下标获取单个分片的进度快照；分片不存在或尚未 `prepare()` 时返回 `null` | `FileCoordinatorChunkProgress \| null` |
| `getQueuedChunkIndexes()` | 获取当前处于严格等待上传状态的分片下标列表；当前只返回状态为 `PENDING` 的分片 | `number[]` |
| `hasQueuedChunks()` | 判断当前是否存在严格等待上传的分片；当前只观察状态为 `PENDING` 的分片 | `boolean` |
| `getFirstQueuedChunkIndex()` | 获取第一块严格等待上传的分片下标；没有 `PENDING` 分片时返回 `null` | `number \| null` |
| `getLastQueuedChunkIndex()` | 获取最后一块严格等待上传的分片下标；没有 `PENDING` 分片时返回 `null` | `number \| null` |
| `getPendingChunkIndexes()` | 获取当前仍需要继续进入上传流程的分片下标列表；当前会返回状态为 `PENDING` 或 `ERROR` 的分片 | `number[]` |
| `getRemainingChunkCount()` | 获取当前仍需要进入上传流程的分片数量；当前和 `getPendingChunkIndexes().length` 口径一致 | `number` |
| `getNextPendingChunkIndex()` | 获取下一块仍需要进入上传流程的分片下标；没有待调度分片时返回 `null` | `number \| null` |
| `getUploadingChunkIndexes()` | 获取当前处于 `UPLOADING` 状态的分片下标列表；适合在取消、暂停或调试时观察当前正在执行的分片 | `number[]` |
| `hasUploadingChunks()` | 判断当前是否存在上传中的分片；当前只观察状态为 `UPLOADING` 的分片 | `boolean` |
| `getFirstUploadingChunkIndex()` | 获取第一块上传中的分片下标；没有上传中分片时返回 `null` | `number \| null` |
| `getLastUploadingChunkIndex()` | 获取最后一块上传中的分片下标；没有上传中分片时返回 `null` | `number \| null` |
| `getUploadingChunkCount()` | 获取当前处于 `UPLOADING` 状态的分片数量；当前和 `getUploadingChunkIndexes().length` 口径一致 | `number` |
| `getFailedChunkIndexes()` | 获取当前上传失败的分片下标列表；当前只会返回状态为 `ERROR` 的分片 | `number[]` |
| `getFirstFailedChunkIndex()` | 获取第一块上传失败的分片下标；没有失败分片时返回 `null` | `number \| null` |
| `getLastFailedChunkIndex()` | 获取最后一块上传失败的分片下标；没有失败分片时返回 `null` | `number \| null` |
| `getFailedChunkCount()` | 获取当前上传失败的分片数量；当前和 `getFailedChunkIndexes().length` 口径一致 | `number` |
| `getChunkStatusCounts()` | 获取当前所有分片按运行时状态聚合后的数量快照 | `FileCoordinatorChunkStatusCounts` |
| `hasFailedChunks()` | 判断当前是否存在上传失败的分片；当前只要存在状态为 `ERROR` 的分片就返回 `true` | `boolean` |
| `resetUploadProgress()` | 清空当前已准备分片的上传运行态；会把分片恢复为 `PENDING`，把实例状态恢复为 `READY`，并返回实际发生变化的分片数量 | `number` |
| `canResetUploadProgress()` | 判断当前是否可以安全清空上传运行态；要求已完成 `prepare()` 且没有活跃上传任务 | `boolean` |
| `resetFailedChunks()` | 清空当前失败分片的上传运行态；会把 `ERROR` 分片恢复为 `PENDING`，并返回被重置的失败分片数量 | `number` |
| `cancel()` | 取消当前活跃的上传任务；会触发当前这一轮上传的 `signal.abort()`，成功取消时返回 `true`，没有活跃上传任务时返回 `false` | `boolean` |
| `canCancel()` | 判断当前实例是否有可取消的活跃上传任务 | `boolean` |
| `pause()` | 暂停当前活跃的上传任务；会触发当前这一轮上传的 `signal.abort()`，成功暂停时返回 `true`，没有活跃上传任务时返回 `false` | `boolean` |
| `canPause()` | 判断当前实例是否有可暂停的活跃上传任务 | `boolean` |
| `resume()` | 从 `PAUSED` 状态恢复上传；会重新调用内部并发调度并继续上传当前仍为 `PENDING` 或 `ERROR` 的分片，不处于 `PAUSED` 状态时返回 `false` | `Promise<boolean>` |
| `canResume()` | 判断当前实例是否处于可恢复上传状态；当前等价于状态是否为 `PAUSED` | `boolean` |
| `canUpload()` | 判断当前实例是否可以开始一轮上传；要求已完成 `prepare()`、没有活跃上传任务且仍有待调度分片 | `boolean` |
| `upload()` | 让 SDK 按当前 `concurrency` 自动调度所有待上传分片；会复用同一轮并发上传任务，成功后根据是否全部完成把实例状态更新为 `READY` 或 `COMPLETED`，失败时进入 `ERROR` | `Promise<void>` |
| `uploadChunk(index)` | 上传指定下标的单个分片；要求先完成 `prepare()` 并且在 `options` 里传入 `uploadChunk` 处理器；调用时分片状态会进入 `UPLOADING`，成功后改为 `SUCCESS`，失败后改为 `ERROR`；当前文件全部分片上传完成后实例状态会进入 `COMPLETED` | `Promise<void>` |
| `getChunkIdentity(index)` | 按下标获取单个分片的唯一标识；`index` 需要是从 `0` 开始的非负整数；在分片不存在或尚未 `prepare()` 时返回 `null` | `FileCoordinatorChunkIdentity \| null` |
| `getChunkInfo(index)` | 按下标获取单个分片的元信息；返回结果里会带上当前分片的 MIME type；`index` 需要是从 `0` 开始的非负整数；在分片不存在或尚未 `prepare()` 时返回 `null` | `FileCoordinatorChunkInfo \| null` |
| `getChunkByteRange(index)` | 按下标获取单个分片的字节范围；只返回 `start`、`end` 和 `size`，分片不存在或尚未 `prepare()` 时返回 `null` | `FileCoordinatorChunkByteRange \| null` |
| `getChunk(index)` | 按下标获取单个分片的 `Blob`；返回的 `Blob` 会继承原文件类型；`index` 需要是从 `0` 开始的非负整数；在分片不存在或尚未 `prepare()` 时返回 `null` | `Blob \| null` |
| `getPrepareResult()` | 获取最近一次 prepare 的结果快照；在调用 `prepare()` 前返回 `null` | `FileCoordinatorPrepareResult \| null` |
