import { useState } from "react";
import { Button, ConfigProvider, Upload } from "antd";
import { FileCoordinator } from "./sdk/FileCoordinator";

export default function App() {
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [fileLastModified, setFileLastModified] = useState(0);
  const [fileIdentity, setFileIdentity] = useState("");
  const [hasFirstChunk, setHasFirstChunk] = useState(false);
  const [firstChunkRange, setFirstChunkRange] = useState("");
  const [firstChunkBlobSize, setFirstChunkBlobSize] = useState(0);
  const [firstChunkBlobType, setFirstChunkBlobType] = useState("");
  const [status, setStatus] = useState("");
  const [chunkCount, setChunkCount] = useState(0);
  const [cachedChunkCount, setCachedChunkCount] = useState(0);
  const [resolvedChunkSize, setResolvedChunkSize] = useState(0);
  const [chunkSize, setChunkSize] = useState(0);
  const [prepareCalls, setPrepareCalls] = useState(0);

  return (
    <ConfigProvider>
      <>
        <Upload
          maxCount={1}
          showUploadList={false}
          customRequest={async ({ file, onError, onSuccess }) => {
            try {
              const coordinator = new FileCoordinator(file as File, {});

              setFileName(coordinator.getFile().name);
              setFileSize(0);
              setFileLastModified(coordinator.getFile().lastModified);
              setFileIdentity(coordinator.getFileIdentity());
              setHasFirstChunk(false);
              setFirstChunkRange("");
              setFirstChunkBlobSize(0);
              setFirstChunkBlobType("");
              setStatus(coordinator.getStatus());
              setChunkCount(coordinator.getChunkCount());
              setCachedChunkCount(0);
              setResolvedChunkSize(coordinator.getOptions().chunkSize);
              setChunkSize(0);
              setPrepareCalls(0);

              const [, prepareResult] = await Promise.all([
                coordinator.prepare(),
                coordinator.prepare(),
              ]);
              const latestPrepareResult = coordinator.getPrepareResult();
              const hasPreparedFirstChunk = coordinator.hasChunk(0);
              const firstChunkInfo = coordinator.getChunkInfo(0);
              const firstChunk = coordinator.getChunk(0);

              setFileIdentity(prepareResult.fileIdentity);
              setHasFirstChunk(hasPreparedFirstChunk);
              setFileSize(prepareResult.fileSize);
              setFirstChunkRange(
                firstChunkInfo
                  ? `${firstChunkInfo.start}-${firstChunkInfo.end}`
                  : "",
              );
              setFirstChunkBlobSize(firstChunk?.size ?? 0);
              setFirstChunkBlobType(firstChunk?.type ?? "");
              setStatus(prepareResult.status);
              setChunkCount(prepareResult.chunkCount);
              setCachedChunkCount(latestPrepareResult?.chunkCount ?? 0);
              setChunkSize(prepareResult.chunkSize);
              setPrepareCalls(2);
              onSuccess?.({}, file);
            } catch (error) {
              onError?.(error as Error);
            }
          }}
        >
          <Button>Select File</Button>
        </Upload>
        {fileName ? <div>file: {fileName}</div> : null}
        <div>fileSize: {fileSize}</div>
        <div>lastModified: {fileLastModified}</div>
        {fileIdentity ? <div>identity: {fileIdentity}</div> : null}
        <div>hasFirstChunk: {String(hasFirstChunk)}</div>
        {firstChunkRange ? <div>firstChunkRange: {firstChunkRange}</div> : null}
        <div>firstChunkBlobSize: {firstChunkBlobSize}</div>
        {firstChunkBlobType ? <div>firstChunkBlobType: {firstChunkBlobType}</div> : null}
        {status ? <div>status: {status}</div> : null}
        <div>chunkCount: {chunkCount}</div>
        <div>cachedChunkCount: {cachedChunkCount}</div>
        <div>resolvedChunkSize: {resolvedChunkSize}</div>
        <div>chunkSize: {chunkSize}</div>
        <div>prepareCalls: {prepareCalls}</div>
      </>
    </ConfigProvider>
  );
}
