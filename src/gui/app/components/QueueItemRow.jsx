"use client";

import React, {useContext, Fragment } from "react";
import {apiCall, msgLoadWorkflow, } from "../internals/functions";
import {AppContext} from "../internals/app-context";
import {MediaItem} from "../components/MediaItem";
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import {memo, useMemo } from "react";
import {MediaOutputs} from "../models/MediaOutputs";
import {useOptionsStore} from "../stores/optionsStore";
import {useAppStore} from "../stores/appStore";
import {LoaderSpinner} from "../components/LoaderSpinner";

/**
 *
 * Single Queue Item Row
 *
 */
export const QueueItemRow = memo(function QueueItemRow({item, className, loader, index, mode, info }) {
  // console.log("QueueItemRow", item[3].db_id);
  const {onMediaItemClick} = useContext(AppContext);

  const galleryOptions = useOptionsStore((state) => state.Gallery);
  const route = useAppStore((state) => state.route);
  const filters = useAppStore((state) => state.filters);
  const thumbMode = useOptionsStore((state) => state.thumb_mode);

  const setFilters = useAppStore((state) => state.setFilters);

  const mediaOutputs = useMemo(() => {
    if (item?.[3]?.outputs && route === "completed") {
      return new MediaOutputs(item[3], galleryOptions);
    }
    return null;
  },  [item, route, galleryOptions]);

  async function cancelQueueItem() {
    const route = (mode === 'running' || mode === 'external') ? 'interrupt' : 'queue';

    await apiCall(`api/${route}`, {
      delete: [item[1]],
    })
  }

  /**
   * Post message to parent window to load workflow stored in pnginfo
   */
  async function loadQueueItem() {
    // console.log("Loading queue item", item);
    msgLoadWorkflow(item[3].extra_pnginfo.workflow, item[0]);
  }

  // POST to /api/archive with array of item ids to archive
  async function archiveQueueItem() {
    await apiCall(`queue_manager/archive`, {
      archive: [item[3].db_id],
    })
  }

  async function playItem() {
    await apiCall(`queue_manager/play`, {items: [item[3].db_id], front: useAppStore.getState().shiftDown === true, clientId: useAppStore.getState().clientId})
  }

  async function filterByWorkflow() {
    setFilters({...filters, workflow: {
        type: 'workflow',
        value: item[3].extra_pnginfo.workflow.id,
        valueLabel: item[3].extra_pnginfo.workflow.workflow_name
    }});
  }


  return (
    <>
      {/*
        *
        * Queue Item Details
        *
        */}
      <TableRow className={(className ? ' ' + className : '')} key={"details" + item[3].db_id}>

        {/* Index and loader */}
        <TableCell className="px-3 py-1 serial">
          <span>{(index === undefined || !info) ? '' : index + 1 + info.page * info.page_size}</span>
          {loader &&
            <LoaderSpinner />
          }
        </TableCell>

        {/* Thumbnail in Cover mode */}
        {route === 'completed' && thumbMode === "cover" && (galleryOptions.ShowImages || galleryOptions.ShowVideos) &&
          <TableCell className="px-3 py-1 cover">
            {mediaOutputs && mediaOutputs.cover &&
              <MediaItem
                file={mediaOutputs.cover}
                controls={false}
                autoplay={false}
                onClick={() => {onMediaItemClick({dbID: item[3].db_id, fileIndex: 0})}}
                className={'play-button'}
                title={"Open gallery"}
              />
            }
          </TableCell>
        }

        {/* Workflow Name */}
        <TableCell className="px-3 py-1 text-left name">
          <div className={"name-cell"}>
            {mediaOutputs && item[3].total_files > 0 &&
              <span className="total" title={"Total file outputs: " + mediaOutputs.total}
                onClick={() => {onMediaItemClick({dbID: item[3].db_id, fileIndex: 0})}}
              >{mediaOutputs.total}</span>
            }
            <button className={'plain'} onClick={filterByWorkflow} title={"Filter view by the workflow"}>
              {mode === 'external'
                ? "External job"
                : (item[3].extra_pnginfo.workflow.workflow_name ? item[3].extra_pnginfo.workflow.workflow_name : "")
              }
            </button>
          </div>

        </TableCell>

        {/* Item Actions */}
        <TableCell className={'px-3 py-1 text-right actions'}>
          <Stack direction="row" sx={{ justifyContent: "flex-end" }} spacing={1}>
            <Button variant="contained" size="small" color="error"  onClick={cancelQueueItem} title="Delete workflow from queue">Delete</Button>

            {mode !== 'external' &&
              <Button variant="contained" size="small" color="success" onClick={loadQueueItem} title="Load workflow">Load</Button>
            }
            {route === 'queue' && mode !== 'running' &&
              <Button variant="contained" size="small" color="warning" onClick={archiveQueueItem} title="Move to the archive">Archive</Button>
            }
            {route === 'archive' &&
              <Button variant="contained" size="small" className={"run"} onClick={playItem} title="Move to queue" startIcon={<PlayArrowOutlinedIcon fontSize="small" />}>
                Run
              </Button>
            }
            {route === 'completed' &&
              <Button variant="contained" size="small" className={"view"} onClick={() => {onMediaItemClick({dbID: item[3].db_id, fileIndex: 0})}} title="View outputs in gallery">
                View
              </Button>
            }
          </Stack>
        </TableCell>
      </TableRow>

      {/*
        *
        * Queue Item Outputs
        *
        */}
      {item[3].total_files > 0 && route === 'completed' && thumbMode === "grid" && (galleryOptions.ShowImages || galleryOptions.ShowVideos) &&
        <tr className="dark:odd:bg-neutral-900 odd:bg-neutral-100 gallery" key={"gallery" + item[3].db_id}>
          <td colSpan={3} className="px-3 py-1">
            <div className="flex flex-wrap gap-2 items">
              {mediaOutputs && mediaOutputs.files && mediaOutputs.files.length > 0 &&
                mediaOutputs.files.map((file, fileIndex) => (
                  <MediaItem
                    key={file.filename + '-' + file.subfolder}
                    file={file}
                    autoplay={false}
                    onClick={() => {
                      onMediaItemClick({
                        dbID: item[3].db_id,
                        fileIndex: fileIndex
                      })
                    }}
                    title={"Open gallery"}
                  />
                ))
              }
            </div>
          </td>
        </tr>
      }
    </>

  );
})
