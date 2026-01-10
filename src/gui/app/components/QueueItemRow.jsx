// `src/gui/app/components/QueueItemRow.jsx`
"use client";

import React, { memo, useCallback, useContext, useMemo } from "react";
import { apiCall, msgLoadWorkflow } from "../internals/functions";
import { AppContext } from "../internals/app-context";
import { MediaItem } from "../components/MediaItem";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import PlayArrowOutlinedIcon from "@mui/icons-material/PlayArrowOutlined";
import { MediaOutputs } from "../models/MediaOutputs";
import { LoaderSpinner } from "../components/LoaderSpinner";

export const QueueItemRow = memo(
  function QueueItemRow({
    item,
    className,
    loader,
    index,
    mode,
    info,

    route,
    thumbMode,
    galleryOptions,
    filters,
  }) {
    const { onMediaItemClick, fetchQueueItems } = useContext(AppContext);

    const dbId = item?.[3]?.db_id;
    const workflow = item?.[3]?.extra_pnginfo?.workflow;

    const mediaOutputs = useMemo(() => {
      if (item?.[3]?.outputs && route === "completed") {
        return new MediaOutputs(item[3], galleryOptions);
      }
      return null;
    }, [item, route, galleryOptions]);

    const cancelQueueItem = useCallback(async () => {
      const cancelRoute = mode === "running" || mode === "external" ? "interrupt" : "queue";
      await apiCall(`api/${cancelRoute}`, { delete: [item[1]] });
    }, [mode, item]);

    const loadQueueItem = useCallback(() => {
      if (workflow?.workflow) {
        msgLoadWorkflow(workflow.workflow, item[0]);
      }
    }, [workflow, item]);

    const archiveQueueItem = useCallback(async () => {
      await apiCall(`queue_manager/archive`, { archive: [dbId] });
    }, [dbId]);

    const playItem = useCallback(async () => {
      const { shiftDown, clientId } = useAppStore.getState();

      await apiCall(`queue_manager/play`, {
        items: [dbId],
        front: shiftDown === true,
        clientId,
      });
    }, [dbId]);

    const filterByWorkflow = useCallback(() => {
      if (!workflow?.id) return;

      fetchQueueItems({
        filters: {
          ...filters,
          workflow: {
            type: "workflow",
            value: workflow.id,
            valueLabel: workflow.workflow_name,
          },
        },
      });
    }, [fetchQueueItems, filters, workflow]);

    const showCover =
      route === "completed" &&
      thumbMode === "cover" &&
      (galleryOptions.ShowImages || galleryOptions.ShowVideos);

    const showGrid =
      item?.[3]?.total_files > 0 &&
      route === "completed" &&
      thumbMode === "grid" &&
      (galleryOptions.ShowImages || galleryOptions.ShowVideos);

    const rowIndex =
      index === undefined || !info ? "" : index + 1 + info.page * info.page_size;

    return (
      <>
        {/*
        *
        * Queue Item Details
        *
        */}
        <TableRow className={className ? ` ${className}` : ""}>
          <TableCell className="px-3 py-1 serial">
            <span>{rowIndex}</span>
            {loader ? <LoaderSpinner /> : null}
          </TableCell>

          {/* Thumbnail in Cover mode */}
          {showCover ? (
            <TableCell className="px-3 py-1 cover">
              {mediaOutputs?.cover ? (
                <MediaItem
                  file={mediaOutputs.cover}
                  controls={false}
                  autoplay={false}
                  onClick={() => onMediaItemClick({ dbID: dbId, fileIndex: 0 })}
                  className="play-button"
                  title="Open gallery"
                />
              ) : null}
            </TableCell>
          ) : null}

          {/* Workflow Name */}
          <TableCell className="px-3 py-1 text-left name">
            <div className="name-cell">
              {mediaOutputs && item[3].total_files > 0 ? (
                <span
                  className="total"
                  title={`Total file outputs: ${mediaOutputs.total}`}
                  onClick={() => onMediaItemClick({ dbID: dbId, fileIndex: 0 })}
                >
                  {mediaOutputs.total}
                </span>
              ) : null}

              <button className="plain" onClick={filterByWorkflow} title="Filter view by the workflow">
                {mode === "external"
                  ? "External job"
                  : workflow?.workflow_name
                    ? workflow.workflow_name
                    : ""}
              </button>
            </div>
          </TableCell>

          {/* Item Actions */}
          <TableCell className="px-3 py-1 text-right actions">
            <Stack direction="row" sx={{ justifyContent: "flex-end" }} spacing={1}>
              <Button
                variant="contained"
                size="small"
                color="error"
                onClick={cancelQueueItem}
                title="Delete workflow from queue"
              >
                Delete
              </Button>

              {mode !== "external" ? (
                <Button
                  variant="contained"
                  size="small"
                  color="success"
                  onClick={loadQueueItem}
                  title="Load workflow"
                >
                  Load
                </Button>
              ) : null}

              {route === "queue" && mode !== "running" ? (
                <Button
                  variant="contained"
                  size="small"
                  color="warning"
                  onClick={archiveQueueItem}
                  title="Move to the archive"
                >
                  Archive
                </Button>
              ) : null}

              {route === "archive" ? (
                <Button
                  variant="contained"
                  size="small"
                  className="run"
                  onClick={playItem}
                  title="Move to queue"
                  startIcon={<PlayArrowOutlinedIcon fontSize="small" />}
                >
                  Run
                </Button>
              ) : null}

              {route === "completed" ? (
                <Button
                  variant="contained"
                  size="small"
                  className="view"
                  onClick={() => onMediaItemClick({ dbID: dbId, fileIndex: 0 })}
                  title="View outputs in gallery"
                >
                  View
                </Button>
              ) : null}
            </Stack>
          </TableCell>
        </TableRow>

        {/*
        *
        * Queue Item Outputs
        *
        */}
        {showGrid ? (
          <TableRow className="dark:odd:bg-neutral-900 odd:bg-neutral-100 gallery">
            <TableCell colSpan={3} className="px-3 py-1">
              <div className="flex flex-wrap gap-2 items">
                {mediaOutputs?.files?.length
                  ? mediaOutputs.files.map((file, fileIndex) => (
                      <MediaItem
                        key={`${file.filename}-${file.subfolder}`}
                        file={file}
                        autoplay={false}
                        onClick={() => onMediaItemClick({ dbID: dbId, fileIndex })}
                        title="Open gallery"
                      />
                    ))
                  : null}
              </div>
            </TableCell>
          </TableRow>
        ) : null}
      </>
    );
  },
  (prev, next) => {
    // Custom compare: skip re\-render if the item identity changes but the content  hasn’t.
    const prevId = prev.item?.[3]?.db_id;
    const nextId = next.item?.[3]?.db_id;
    if (prevId !== nextId) return false;

    return (
      prev.loader === next.loader &&
      prev.index === next.index &&
      prev.mode === next.mode &&
      prev.route === next.route &&
      prev.thumbMode === next.thumbMode &&
      prev.galleryOptions === next.galleryOptions &&
      prev.filters === next.filters &&
      prev.info?.page === next.info?.page &&
      prev.info?.page_size === next.info?.page_size
    );
  }
);
