# FileCoordinator

`FileCoordinator` 是当前 SDK 的单文件基础类。

## Design

- 一个实例只处理一个文件
- 多文件场景由外层自己包一层管理
- 当前阶段只保留最基础的文件和配置存储能力

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
await coordinator.upload();
const progress = coordinator.getProgress();
const remainingBytes = progress.remainingBytes;
const failedChunkIndexes = coordinator.getFailedChunkIndexes();
const firstChunkStatus = coordinator.getChunkStatus(0);
```

当前更推荐直接调用 `upload()` 让 SDK 自己调度整轮上传；`uploadChunk(index)` 更适合少量特殊场景下的低层控制。

如果需要取消当前活跃上传，可以保留 `const uploadTask = coordinator.upload()` 返回的 Promise，再在外层调用 `coordinator.cancel()` 触发这一轮上传的中断。

如果只是临时暂停当前活跃上传，可以调用 `coordinator.pause()`；被暂停中的分片会恢复回 `PENDING`，实例状态会进入 `PAUSED`。

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
| `uploadChunk` | 调用方注入的单分片上传函数；SDK 不关心请求库、鉴权和接口结构，会在实例方法 `upload()` 或 `uploadChunk(index)` 内把分片数据交给它 | `FileCoordinatorUploadChunkHandler` | - |

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

当前 `getPendingChunkIndexes()` 的 pending 语义只包含 `PENDING` 和 `ERROR`，不会把已经处于 `UPLOADING` 的分片再次返回出来。

`getQueuedChunkIndexes()` 是更严格的等待队列视角，只返回 `PENDING` 分片；如果调用方需要把失败分片也纳入下一轮调度，应继续使用 `getPendingChunkIndexes()`。

`getUploadedChunkIndexes()` 和 `getUploadedChunkCount()` 使用同一套成功口径，只有当前状态为 `SUCCESS` 的分片会被计入。

和它相对的是，`getUploadingChunkIndexes()` 只会返回当前已经进入上传执行中的分片，不会包含 `PENDING`、`SUCCESS` 或 `ERROR` 状态的分片。

`getFailedChunkIndexes()` 只观察当前状态为 `ERROR` 的分片；这些分片仍会被 `getPendingChunkIndexes()` 返回，并能在下一次 `upload()` 调用里继续参与调度。

`getChunkStatusCounts()` 会按当前本地分片状态聚合计数，状态口径和各个 `get*ChunkIndexes()` 方法保持一致。

`resetUploadProgress()` 只会在当前没有活跃上传任务时生效；它不会重新切片，也不会清空 `prepare()` 生成的分片元信息，只会把分片状态和本地上传字节进度恢复到初始上传态。返回值表示实际发生变化的分片数量，原本已经处于初始上传态的分片不会计入。

`resetFailedChunks()` 是更窄的状态整理方法，只会处理当前为 `ERROR` 的分片；它不会主动发起上传，调用方可以在清理失败态后再次调用 `upload()`。

当前 `getProgress()` 的 `uploadedBytes` 统计口径是：`SUCCESS` 分片按整片大小计入，`UPLOADING` 分片按最近一次 `reportProgress` 回传值计入，`PENDING` 和 `ERROR` 分片默认不计入整体进度。

`getChunkProgress(index)` 使用同一套字节统计口径，只是把范围限制在单个分片上；无效下标会返回 `null`。

其中 `remainingBytes` 是基于当前本地快照计算出的 `totalBytes - uploadedBytes`，不会额外查询服务端状态。

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
| `getUploadedChunkIndexes()` | 获取当前已经上传完成的分片下标列表；当前只返回状态为 `SUCCESS` 的分片 | `number[]` |
| `getProgress()` | 获取当前文件的聚合上传进度快照；会返回总字节数、已计入进度的上传字节数、整体百分比和已完成分片数量 | `FileCoordinatorProgress` |
| `getChunkProgress(index)` | 按下标获取单个分片的进度快照；分片不存在或尚未 `prepare()` 时返回 `null` | `FileCoordinatorChunkProgress \| null` |
| `getQueuedChunkIndexes()` | 获取当前处于严格等待上传状态的分片下标列表；当前只返回状态为 `PENDING` 的分片 | `number[]` |
| `getPendingChunkIndexes()` | 获取当前仍需要继续进入上传流程的分片下标列表；当前会返回状态为 `PENDING` 或 `ERROR` 的分片 | `number[]` |
| `getUploadingChunkIndexes()` | 获取当前处于 `UPLOADING` 状态的分片下标列表；适合在取消、暂停或调试时观察当前正在执行的分片 | `number[]` |
| `getFailedChunkIndexes()` | 获取当前上传失败的分片下标列表；当前只会返回状态为 `ERROR` 的分片 | `number[]` |
| `getChunkStatusCounts()` | 获取当前所有分片按运行时状态聚合后的数量快照 | `FileCoordinatorChunkStatusCounts` |
| `hasFailedChunks()` | 判断当前是否存在上传失败的分片；当前只要存在状态为 `ERROR` 的分片就返回 `true` | `boolean` |
| `resetUploadProgress()` | 清空当前已准备分片的上传运行态；会把分片恢复为 `PENDING`，把实例状态恢复为 `READY`，并返回实际发生变化的分片数量 | `number` |
| `resetFailedChunks()` | 清空当前失败分片的上传运行态；会把 `ERROR` 分片恢复为 `PENDING`，并返回被重置的失败分片数量 | `number` |
| `cancel()` | 取消当前活跃的上传任务；会触发当前这一轮上传的 `signal.abort()`，成功取消时返回 `true`，没有活跃上传任务时返回 `false` | `boolean` |
| `pause()` | 暂停当前活跃的上传任务；会触发当前这一轮上传的 `signal.abort()`，成功暂停时返回 `true`，没有活跃上传任务时返回 `false` | `boolean` |
| `resume()` | 从 `PAUSED` 状态恢复上传；会重新调用内部并发调度并继续上传当前仍为 `PENDING` 或 `ERROR` 的分片，不处于 `PAUSED` 状态时返回 `false` | `Promise<boolean>` |
| `upload()` | 让 SDK 按当前 `concurrency` 自动调度所有待上传分片；会复用同一轮并发上传任务，成功后根据是否全部完成把实例状态更新为 `READY` 或 `COMPLETED`，失败时进入 `ERROR` | `Promise<void>` |
| `uploadChunk(index)` | 上传指定下标的单个分片；要求先完成 `prepare()` 并且在 `options` 里传入 `uploadChunk` 处理器；调用时分片状态会进入 `UPLOADING`，成功后改为 `SUCCESS`，失败后改为 `ERROR`；当前文件全部分片上传完成后实例状态会进入 `COMPLETED` | `Promise<void>` |
| `getChunkIdentity(index)` | 按下标获取单个分片的唯一标识；`index` 需要是从 `0` 开始的非负整数；在分片不存在或尚未 `prepare()` 时返回 `null` | `FileCoordinatorChunkIdentity \| null` |
| `getChunkInfo(index)` | 按下标获取单个分片的元信息；返回结果里会带上当前分片的 MIME type；`index` 需要是从 `0` 开始的非负整数；在分片不存在或尚未 `prepare()` 时返回 `null` | `FileCoordinatorChunkInfo \| null` |
| `getChunk(index)` | 按下标获取单个分片的 `Blob`；返回的 `Blob` 会继承原文件类型；`index` 需要是从 `0` 开始的非负整数；在分片不存在或尚未 `prepare()` 时返回 `null` | `Blob \| null` |
| `getPrepareResult()` | 获取最近一次 prepare 的结果快照；在调用 `prepare()` 前返回 `null` | `FileCoordinatorPrepareResult \| null` |
