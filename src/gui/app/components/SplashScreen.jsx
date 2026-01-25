import Button from "@mui/material/Button";
import CloseSharpIcon from '@mui/icons-material/CloseSharp';

export function SplashScreen({onClick}) {
  return (
    <div className="splash-screen">
      <Button className={"close"} onClick={onClick}>
        <CloseSharpIcon />
      </Button>
      <div className="splash-content">
        <h1>ComfyUI Queue Manager</h1>
        <h4 className={"sub"}>Version: v0.1.0</h4>
        <h4 className={"sub"}>Released: 25<sup>th</sup> January 2026</h4>
        <h2>What's new?</h2>
        <h3>Previews and gallery</h3>
        <p>Release v0.1.0 introduces a big new feature: outputs previews and gallery.</p>
        <p>Head over to the <b>Completed</b> tab to see previews from generated outputs (only new jobs completed after this release was introduced). Click on media item to see it in <b>Gallery</b> mode. Keyboard shortcuts available. </p>
        <h3>Settings</h3>
        <p>A new settings panel is available in <b>ComfyUI Menu -&gt; Settings -&gt; Queue Manager</b> where you can influence certain features of the extension.</p>
        <h3>New style and UI improvements</h3>
        <p>An attempt to make the UI look less motley. </p>
        <p>More functional pagination experience, especially if you hoard tens of pages.</p>
        <h3>Completion Time</h3>
        <p>From now on completed jobs will show total execution time.</p>
        <h3>Bugfixes</h3>
        <p>A couple of minor unreported issues discovered throughout. Check Release Notes for more details.</p>
        <p><br/>
          <i>For more details check the updated manual on Github: <a href={"https://github.com/QuietNoise/comfyui_queue_manager?tab=readme-ov-file#manual"} target={"_blank"}>Queue Manager Manual</a>.</i><br/>
          <i>For full Release Notes view <a href={"https://github.com/QuietNoise/comfyui_queue_manager/blob/main/CHANGELOG.md"} target={"_blank"}>Changelog</a>.</i><br />
          <i>Leave a feedback or report an issue here <a href={"https://github.com/QuietNoise/comfyui_queue_manager/issues"} target={"_blank"}>Issues</a>. </i>
        </p>

      </div>
    </div>
  );
}
