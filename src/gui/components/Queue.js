"use client";           // (keep for app-router; harmless in pages-router)

import React, {useContext, useEffect, useState, Fragment, useCallback} from "react";
import {baseURL} from "@/internals/config";
import {apiCall, mediaType, msgLoadWorkflow, hasVideos} from "@/internals/functions";
import {AppContext} from "@/internals/app-context";
import {MediaItem} from "@/components/MediaItem";
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import {memo, useMemo } from "react";
import {MediaOutputs} from "@/models/MediaOutputs";

/**
 *
 * Single Queue Item Row
 *
 */
const QueueItemRow = memo(function QueueItemRow({item, className, loader, index, mode, info}) {

  const {appStatus, setAppStatus, onMediaItemClick} = useContext(AppContext);

  const mediaOutputs = useMemo(() => {
    if (item?.[3]?.outputs && appStatus.route === "completed") {
      return new MediaOutputs(item[3], appStatus.options?.Gallery ?? {});
    }
    return null;
  },  [item, appStatus.route, appStatus.options]);

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
    await apiCall(`queue_manager/play`, {items: [item[3].db_id], front: appStatus.shiftDown === true, clientId: appStatus.clientId})
  }

  async function filterByWorkflow() {
    // Post message to parent window to filter by workflow
    setAppStatus(prev => ({...prev, filters: {...appStatus.filters, workflow: {
          type: 'workflow',
          value: item[3].extra_pnginfo.workflow.id,
          valueLabel: item[3].extra_pnginfo.workflow.workflow_name
        }}}));
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
        {appStatus.route === 'completed' && appStatus.options.thumb_mode === "cover" && (appStatus.options.Gallery.ShowImages || appStatus.options.Gallery.ShowVideos) &&
          <TableCell className="px-3 py-1 cover">
            {mediaOutputs && mediaOutputs.cover &&
              <MediaItem
                file={mediaOutputs.cover}
                controls={false}
                autoplay={false}
                onClick={() => {onMediaItemClick({dbID: item[3].db_id, fileIndex: 0})}}
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
            {appStatus.route === 'queue' && mode !== 'running' &&
              <Button variant="contained" size="small" color="warning" onClick={archiveQueueItem} title="Move to the archive">Archive</Button>
            }
            {appStatus.route === 'archive' &&
              <Button variant="contained" size="small" className={"run"} onClick={playItem} title="Move to queue" startIcon={<PlayArrowOutlinedIcon fontSize="small" />}>
                Run
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
      {item[3].total_files > 0 && appStatus.route === 'completed' && appStatus.options.thumb_mode === "grid" && (appStatus.options.Gallery.ShowImages || appStatus.options.Gallery.ShowVideos) &&
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

const QueueItems = memo(function QueueItems({running, pending, error, isLoading, info}) {
  return (
    <>
      {running.map(item => (
        <QueueItemRow item={item} key={item[1]} className={'running'} loader={true} mode={ item[3].extra_pnginfo ? 'running' : 'external'}  info={info} />
      ))}
      {pending.map((item, index) => (
        <QueueItemRow item={item} key={item[3].db_id} className={'pending'} index={index} info={info}/>
      ))}
    </>
  );

})

function LoaderSpinner() {
  return <span className="loader py-1 ">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
           stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round"
                                                          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
    </span>;
}

// take items from parent component
export const Queue = memo(function Queue( { data, isLoading, error, progress } ) {
  const {appStatus, setAppStatus} = useContext(AppContext)

  const [state, setState] = useState({
    pending:[],
    running:[],
  })

    // lowercase and replace spaces with _
  const coverMode = String(appStatus.options?.Completed?.CoverThumbMode ?? "default").toLowerCase().replace(/\s+/g, '_');
  const gridMode = String(appStatus.options?.Completed?.GridThumbMode ?? "default").toLowerCase().replace(/\s+/g, '_');

  useEffect(function () {
    if (!data) return;
    setState({
      pending: data.pending ? data.pending : [],
      running: data.running ? data.running : [],
    });
  }, [data]);



  return (
    <div className={"overflow-x-auto table-wrapper" + (isLoading ? ' loading' : '') + ' cover-' + coverMode + ' grid-' + gridMode + ' mode-'} style={{"--job-progress": progress + "%"}}>
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table className="min-w-full border border-0" size="small" stickyHeader>
            <TableHead className="dark:bg-neutral-800 bg-neutral-200 text-xs uppercase">
              <TableRow>
                <TableCell className="px-3 py-2 text-left">#</TableCell>
                {appStatus.route === 'completed' && appStatus.options.thumb_mode === "cover" && (appStatus.options.Gallery.ShowImages || appStatus.options.Gallery.ShowVideos) &&
                  <TableCell className="px-3 py-2 cover">Thumbnail</TableCell>
                }
                <TableCell className="px-3 py-2 text-left">Workflow</TableCell>
                <TableCell className="px-3 py-2" align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {error && <TableRow>
                <TableCell colSpan={3} className="text-red-500 text-center info-cell">Loading failed: {error}</TableCell>
              </TableRow>}
              {!isLoading && (!data || (!data.running.length && !data.pending.length)) && <TableRow>
                <TableCell colSpan={3} className="italic text-center info-cell">No items.</TableCell>
              </TableRow>}
              {isLoading && !data && <TableRow>
                <TableCell className="px-3 py-1 serial">
                  <LoaderSpinner />
                </TableCell>
                <TableCell colSpan={2} className="italic text-center info-cell">Loading...</TableCell>
              </TableRow>}
              {data &&
                <QueueItems isLoading={isLoading} running={state.running} pending={state.pending} error={error} info={data.info} />
              }

            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

    </div>
  );
})
