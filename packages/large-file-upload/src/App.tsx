import { useState } from "react";
import { Button, ConfigProvider, Upload } from "antd";
import { FileCoordinator } from "./sdk/FileCoordinator";

export default function App() {
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [fileLastModified, setFileLastModified] = useState(0);
  const [fileIdentity, setFileIdentity] = useState("");
  const [isPrepared, setIsPrepared] = useState(false);
  const [hasFirstChunk, setHasFirstChunk] = useState(false);
  const [firstChunkIdentity, setFirstChunkIdentity] = useState("");
  const [firstChunkStatus, setFirstChunkStatus] = useState("");
  const [firstChunkRange, setFirstChunkRange] = useState("");
  const [firstChunkType, setFirstChunkType] = useState("");
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
              const updatedChunkSize = coordinator.setChunkSize(1024 * 1024);

              setFileName(coordinator.getFile().name);
              setFileSize(0);
              setFileLastModified(coordinator.getFile().lastModified);
              setFileIdentity(coordinator.getFileIdentity());
              setIsPrepared(false);
              setHasFirstChunk(false);
              setFirstChunkIdentity("");
              setFirstChunkStatus("");
              setFirstChunkRange("");
              setFirstChunkType("");
              setFirstChunkBlobSize(0);
              setFirstChunkBlobType("");
              setStatus(coordinator.getStatus());
              setChunkCount(coordinator.getChunkCount());
              setCachedChunkCount(0);
              setResolvedChunkSize(updatedChunkSize);
              setChunkSize(0);
              setPrepareCalls(0);

              const [, prepareResult] = await Promise.all([
                coordinator.prepare(),
                coordinator.prepare(),
              ]);
              const latestPrepareResult = coordinator.getPrepareResult();
              const prepared = coordinator.isPrepared();
              const hasPreparedFirstChunk = coordinator.hasChunk(0);
              const preparedFirstChunkIdentity = coordinator.getChunkIdentity(0);
              const preparedFirstChunkStatus = coordinator.getChunkStatus(0);
              const firstChunkInfo = coordinator.getChunkInfo(0);
              const firstChunk = coordinator.getChunk(0);

              setFileIdentity(prepareResult.fileIdentity);
              setIsPrepared(prepared);
              setHasFirstChunk(hasPreparedFirstChunk);
              setFirstChunkIdentity(preparedFirstChunkIdentity ?? "");
              setFirstChunkStatus(preparedFirstChunkStatus ?? "");
              setFileSize(prepareResult.fileSize);
              setFirstChunkRange(
                firstChunkInfo
                  ? `${firstChunkInfo.start}-${firstChunkInfo.end}`
                  : "",
              );
              setFirstChunkType(firstChunkInfo?.type ?? "");
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
        <div>isPrepared: {String(isPrepared)}</div>
        <div>hasFirstChunk: {String(hasFirstChunk)}</div>
        {firstChunkIdentity ? <div>firstChunkIdentity: {firstChunkIdentity}</div> : null}
        {firstChunkStatus ? <div>firstChunkStatus: {firstChunkStatus}</div> : null}
        {firstChunkRange ? <div>firstChunkRange: {firstChunkRange}</div> : null}
        {firstChunkType ? <div>firstChunkType: {firstChunkType}</div> : null}
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
