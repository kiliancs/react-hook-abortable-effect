# useAbortableEffect

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/kiliancs/react-hook-abortable-effect/blob/master/LICENSE) [![npm version](https://img.shields.io/npm/v/react-use-abortable-effect.svg?style=flat)](https://www.npmjs.com/package/react-use-abortable-effect)

React hook to work with abortable effects in a safe way.

An effect started with `useAbortableEffect` can be aborted at any time and will
be aborted when the React component is unmounted.

While some libraries like axios and Bluebird support aborting effects, and it
wouldn't be too complicated to abort then when a component is unmounted,
`useAbortableEffect` does this automatically, which I think is safer, and usign
the standard `AbortController`. This means effects used with
`useAbortableEffect` can be used anywhere: in a redux store, outside of the
React lifecycle, etc, without any dependency.

More importantly, with just `useEffect` you'd likely need some way for your
effect error handler to check the mount status of your component in order to
prevent setting state or other unintended work when the abort occurs in the
context of unmounting the component, which is a bad practice.

I considered accepting a callback to handle the abort scenario, instead of
throwing an error, but keeping it like the standard makes the code more
portable and durable, at the cost of ergonomics.

## Example

This is a TypeScript example.
```tsx
import React, { FunctionComponent, useState } from "react";

import useAbortableEffect from "./useAbortableEffect";

type DownloadStatus =
  | { status: "Initial" | "InProgress" | "Complete" }
  | { status: "Error"; errorMessage: string };

const assertNever = (unexpected: never): never => {
  throw new Error(`Unexpected value: ${unexpected}`);
};

const LargeVideoDownloader: FunctionComponent<{}> = () => {
  const downloadEffect = useAbortableEffect(signal =>
    fetch("some_url", { signal }), []
  );
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>({
    status: "Initial"
  });

  const startDownloading = async () => {
    setDownloadStatus({ status: "InProgress" });
    try {
      await downloadEffect.start();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : e.toString();
      // Here we would capture the abort as well as any other error.
      // You can tell the abort case if you need to by checking its name:
      // e.name === 'AbortError'
      setDownloadStatus({ status: "Error", errorMessage });
      return;
    }
    setDownloadStatus({ status: "Complete" });
  };

  switch (downloadStatus.status) {
    case "Initial":
      return (
        <p>
          Ready?<button onClick={startDownloading}>Go!</button>
        </p>
      );
    case "InProgress":
      return (
        <p>
          Downloading... <button onClick={downloadEffect.abort}>Cancel</button>
        </p>
      );
    case "Complete":
      return (
        <p>
          Download complete! :){" "}
          <button onClick={downloadEffect.abort}>Download again because yes</button>
        </p>
      );
    case "Error":
      return <p>Error while downloading: {downloadStatus.errorMessage}. <button onClick={startDownloading}>Retry</button></p>;
    default:
      return assertNever(downloadStatus);
  }
};

export default LargeVideoDownloader;
```
