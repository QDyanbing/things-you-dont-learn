# LargeFileUploader

一个框架无关的 TypeScript 大文件上传工具，采用 Class 方式封装，适合在 React、Vue 或任意前端项目中复用。

## 何时使用

需要在前端完整控制大文件上传流程时使用，例如：

1. 文件需要分片上传。
2. 需要展示上传进度、速度、预计剩余时间。
3. 需要支持暂停、恢复、刷新后继续。
4. 需要支持秒传或服务端断点续传。
5. 需要同时兼容 React、Vue 或其他框架。

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
