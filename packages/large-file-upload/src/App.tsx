import { useState } from "react";
import { Button, ConfigProvider, Upload } from "antd";
import { FileCoordinator } from "./sdk/FileCoordinator";

export default function App() {
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [chunkCount, setChunkCount] = useState(0);

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
              setStatus(coordinator.getStatus());
              setChunkCount(coordinator.getChunkCount());

              await coordinator.prepare();

              setStatus(coordinator.getStatus());
              setChunkCount(coordinator.getChunkCount());
              onSuccess?.({}, file);
            } catch (error) {
              onError?.(error as Error);
            }
          }}
        >
          <Button>Select File</Button>
        </Upload>
        {fileName ? <div>file: {fileName}</div> : null}
        {status ? <div>status: {status}</div> : null}
        <div>chunkCount: {chunkCount}</div>
      </>
    </ConfigProvider>
  );
}
