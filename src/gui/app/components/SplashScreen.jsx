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
        <h4 className={"sub"}>Released: 26<sup>th</sup> December 2025</h4>
        <h2>What's new?</h2>
        <h3>Previews and gallery</h3>
        <p>Release v0.1.0 introduces a big new feature: outputs previews and gallery.</p>
        <p>Head over to the <b>Completed</b> tab to see previews from generated outputs (only new jobs completed after this release was introduced). Click on media item to see it in <b>Gallery</b> mode. Keyboard shortcuts available. </p>
        <h3>Settings</h3>
        <p>A new settings panel is available in <b>ComfyUI Menu -&gt; Settings -&gt; Queue Manager</b> where you can influence certain features of the extension.</p>
        <p><br/>
          For more details check the updated manual on Github: <a href={"https://github.com/QuietNoise/comfyui_queue_manager?tab=readme-ov-file#manual"} target={"_blank"}>Queue Manager Manual</a>.
        </p>
      </div>
    </div>
  );
}
