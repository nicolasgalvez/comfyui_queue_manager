// `src/gui/app/components/Queue.jsx`

"use client";

import React, { memo, useMemo } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { LoaderSpinner } from "../components/LoaderSpinner";
import { QueueItemRow } from "../components/QueueItemRow";
import { useAppStore } from "../stores/appStore";
import { useOptionsStore } from "../stores/optionsStore";

const QueueItems = memo(function QueueItems({ running, pending, info }) {
  // Read global state ONCE here (parent of many rows)
  const route = useAppStore((state) => state.route);
  const filters = useAppStore((state) => state.filters);

  const thumbMode = useOptionsStore((state) => state.thumb_mode);
  const galleryOptions = useOptionsStore((state) => state.Gallery);

  // Optional: keep object identity stable if upstream recreates it
  const stableGalleryOptions = useMemo(() => galleryOptions, [galleryOptions]);

  return (
    <>
      {running.map((item) => (
        <QueueItemRow
          key={item?.[3]?.db_id ?? item?.[1]}
          item={item}
          className="running"
          loader={true}
          mode={item?.[3]?.extra_pnginfo ? "running" : "external"}
          info={info}
          route={route}
          thumbMode={thumbMode}
          galleryOptions={stableGalleryOptions}
          filters={filters}
        />
      ))}

      {pending.map((item, index) => (
        <QueueItemRow
          key={item?.[3]?.db_id ?? `${item?.[1]}-${index}`}
          item={item}
          className="pending"
          index={index}
          info={info}
          route={route}
          thumbMode={thumbMode}
          galleryOptions={stableGalleryOptions}
          filters={filters}
        />
      ))}
    </>
  );
});

// take items from parent component
export const Queue = memo(function Queue({ data, isLoading, error, progress }) {
  const route = useAppStore((state) => state.route);
  const thumbMode = useOptionsStore((state) => state.thumb_mode);
  const options = useOptionsStore((state) => state.Completed);
  const galleryOptions = useOptionsStore((state) => state.Gallery);

  const coverMode = String(options.CoverThumbMode ?? "Cropped")
    .toLowerCase()
    .replace(/\s+/g, "_");
  const gridMode = String(options.GridThumbMode ?? "Square Fit")
    .toLowerCase()
    .replace(/\s+/g, "_");

  const running = data?.running ?? [];
  const pending = data?.pending ?? [];

  return (
    <div
      className={
        "overflow-x-auto table-wrapper" +
        (isLoading ? " loading" : "") +
        " cover-" +
        coverMode +
        " grid-" +
        gridMode +
        " mode-"
      }
      style={{ "--job-progress": progress + "%" }}
    >
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer>
          <Table className="min-w-full border border-0" size="small" stickyHeader>
            <TableHead className="dark:bg-neutral-800 bg-neutral-200 text-xs uppercase">
              <TableRow>
                <TableCell className="px-3 py-2 text-left">#</TableCell>
                {route === "completed" &&
                  thumbMode === "cover" &&
                  (galleryOptions.ShowImages || galleryOptions.ShowVideos) && (
                    <TableCell className="px-3 py-2 cover">Thumbnail</TableCell>
                  )}
                <TableCell className="px-3 py-2 text-left workflow-column">
                  Workflow
                </TableCell>
                <TableCell className="px-3 py-2" align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {error && (
                <TableRow>
                  <TableCell colSpan={3} className="text-red-500 text-center info-cell">
                    Loading failed: {error}
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && (!data || (!running.length && !pending.length)) && (
                <TableRow>
                  <TableCell colSpan={3} className="italic text-center info-cell">
                    No items.
                  </TableCell>
                </TableRow>
              )}

              {isLoading && !data && (
                <TableRow>
                  <TableCell className="px-3 py-1 serial">
                    <LoaderSpinner />
                  </TableCell>
                  <TableCell colSpan={2} className="italic text-center info-cell">
                    Loading...
                  </TableCell>
                </TableRow>
              )}

              {data && <QueueItems running={running} pending={pending} info={data.info} />}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
});
