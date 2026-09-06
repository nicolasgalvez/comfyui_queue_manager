import PhotoOutlinedIcon from "@mui/icons-material/PhotoOutlined";
import {Slider} from "@mui/material";
import Stack from "@mui/material/Stack";
import {useState} from "react";

export default function ThumbSlider({onChange, onChangeCommitted, value, min, max, step= 10}) {
  const [val, setVal] = useState(value);

  function onValueChange(e, newValue) {
    setVal(newValue);
    if (onChange) {
      onChange(e, newValue);
    }
  }

  function onCommitment(e, newValue) {
    if (onChangeCommitted) {
      onChangeCommitted(e, newValue);
    }
  }

  function stepUp() {
    const newValue = Math.min(val + step, max);
    onValueChange(null, newValue);
    onCommitment(null, newValue);
  }

  function stepDown() {
    const newValue = Math.max(val - step, min);
    onValueChange(null, newValue);
    onCommitment(null, newValue);
  }

  return (
    <Stack spacing={1} direction="row" sx={{ alignItems: 'center', mb: 1 }} p={1} className={"thumb-size-slider"}>
      <PhotoOutlinedIcon fontSize="small" onClick={stepDown} className={"thumb-size-icon"} />
      <Slider aria-label="Size" size="small"
        onChange={onValueChange}
        onChangeCommitted={onCommitment}
        min={min}
        max={max}
        value={val}
      />
      <PhotoOutlinedIcon fontSize="large" onClick={stepUp} className={"thumb-size-icon"} />
    </Stack>
  )
}
