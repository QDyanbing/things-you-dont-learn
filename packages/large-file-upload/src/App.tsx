import { useState } from "react";
import { Button, ConfigProvider, Upload } from "antd";
import { FileCoordinator } from "./sdk/FileCoordinator";

export default function App() {
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");

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

              await coordinator.prepare();

              setStatus(coordinator.getStatus());
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
      </>
    </ConfigProvider>
  );
}
