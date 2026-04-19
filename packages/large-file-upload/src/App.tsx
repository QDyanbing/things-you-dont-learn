import { useState } from "react";
import { Button, ConfigProvider, Upload } from "antd";
import { FileCoordinator } from "./sdk/FileCoordinator";

export default function App() {
  const [fileName, setFileName] = useState("");
  const [fileIdentity, setFileIdentity] = useState("");
  const [status, setStatus] = useState("");
  const [chunkCount, setChunkCount] = useState(0);
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
              setFileIdentity(coordinator.getFileIdentity());
              setStatus(coordinator.getStatus());
              setChunkCount(coordinator.getChunkCount());
              setChunkSize(0);
              setPrepareCalls(0);

              const [, prepareResult] = await Promise.all([
                coordinator.prepare(),
                coordinator.prepare(),
              ]);

              setFileIdentity(prepareResult.fileIdentity);
              setStatus(prepareResult.status);
              setChunkCount(prepareResult.chunkCount);
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
        {fileIdentity ? <div>identity: {fileIdentity}</div> : null}
        {status ? <div>status: {status}</div> : null}
        <div>chunkCount: {chunkCount}</div>
        <div>chunkSize: {chunkSize}</div>
        <div>prepareCalls: {prepareCalls}</div>
      </>
    </ConfigProvider>
  );
}
