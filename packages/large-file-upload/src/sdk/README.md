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
  createFileIdentity(currentFile) {
    return `biz_${currentFile.name}_${currentFile.size}`;
  },
});
const prepareResult = await coordinator.prepare();
```

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
| `createFileIdentity` | 自定义文件 id 计算函数；不传时会基于 `name`、`size`、`type`、`lastModified` 等元信息生成短 id | `(file: File) => FileCoordinatorFileIdentity` | 默认内置实现 |

### FileCoordinatorResolvedOptions

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `chunkSize` | 当前实例最终生效的分片大小，`getOptions()` 返回的一定是归一化后的值 | `number` | - |
| `createFileIdentity` | 当前实例最终生效的文件 id 计算函数 | `(file: File) => FileCoordinatorFileIdentity` | - |

### FileCoordinatorChunkIdentity

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `-` | 基于文件标识、分片下标和分片范围压缩生成的短 id，用来唯一标记当前分片 | `string` | - |

### FileCoordinatorChunkInfo

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `index` | 当前分片的下标，从 `0` 开始 | `number` | - |
| `chunkIdentity` | 当前分片的唯一标识 | `FileCoordinatorChunkIdentity` | - |
| `type` | 当前分片继承的文件 MIME type | `string` | - |
| `start` | 当前分片的起始字节位置，包含当前值 | `number` | - |
| `end` | 当前分片的结束字节位置，不包含当前值 | `number` | - |
| `size` | 当前分片的字节大小 | `number` | - |

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
| `prepare()` | 重新按当前 `chunkSize` 准备分片数据；重复调用是安全的，并发调用会复用同一轮 prepare，重建前会先清空旧分片；状态会从 `PREPARING` 进入 `READY`，并返回本次 prepare 的摘要结果 | `Promise<FileCoordinatorPrepareResult>` |
| `getChunkCount()` | 获取当前文件分片数量；在调用 `prepare()` 前默认是 `0` | `number` |
| `hasChunk(index)` | 按下标判断当前分片是否存在；`index` 需要是从 `0` 开始的非负整数；在分片不存在或尚未 `prepare()` 时返回 `false` | `boolean` |
| `getChunkIdentity(index)` | 按下标获取单个分片的唯一标识；`index` 需要是从 `0` 开始的非负整数；在分片不存在或尚未 `prepare()` 时返回 `null` | `FileCoordinatorChunkIdentity \| null` |
| `getChunkInfo(index)` | 按下标获取单个分片的元信息；返回结果里会带上当前分片的 MIME type；`index` 需要是从 `0` 开始的非负整数；在分片不存在或尚未 `prepare()` 时返回 `null` | `FileCoordinatorChunkInfo \| null` |
| `getChunk(index)` | 按下标获取单个分片的 `Blob`；返回的 `Blob` 会继承原文件类型；`index` 需要是从 `0` 开始的非负整数；在分片不存在或尚未 `prepare()` 时返回 `null` | `Blob \| null` |
| `getPrepareResult()` | 获取最近一次 prepare 的结果快照；在调用 `prepare()` 前返回 `null` | `FileCoordinatorPrepareResult \| null` |
