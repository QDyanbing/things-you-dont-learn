# SDK Usage Guide

This guide explains how the browser demo should consume `FileCoordinator`.
It focuses on the public SDK surface that app code can call directly, leaving
transport details to the caller-provided upload handler.

## Lifecycle Calls

- Create one coordinator per selected file.
- Call `prepare()` before reading chunk metadata or starting upload work.
- Call `upload()` when the SDK should own chunk scheduling and concurrency.
