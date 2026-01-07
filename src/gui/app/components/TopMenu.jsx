import {EllipsisVertical} from "lucide-react";
import {apiCall} from "../internals/functions";
import {useContext, useState, useRef, useEffect } from "react";
import {AppContext} from "../internals/app-context";

import AdsClickSharpIcon from '@mui/icons-material/AdsClickSharp';
import InfoOutlineSharpIcon from '@mui/icons-material/InfoOutlineSharp';
import Button from "@mui/material/Button";
import {useAppStore} from "../stores/appStore";

export default function TopMenu() {
  const [uiState, setUiState] = useState({
    menuOpen: false,
  });

  const {openSplash} = useContext(AppContext)

  const menuRef = useRef(null);
  const toggleRef = useRef(null);

  function toggleMenu() {
    setUiState(prev => ({...prev, menuOpen: !prev.menuOpen}));
  }

  async function takeOver() {
    toggleMenu();
    apiCall('queue_manager/takeover?client_id='+useAppStore.getState().clientId, null, "GET");
  }

  useEffect(() => {
    if (!uiState.menuOpen) return;

    function onPointerDown(e) {
      const menuEl = menuRef.current;
      const toggleEl = toggleRef.current;
      const target = e.target;

      if (!menuEl || !toggleEl) return;
      if (menuEl.contains(target)) return;
      if (toggleEl.contains(target)) return;

      setUiState(prev => ({...prev, menuOpen: false}));
    }

    document.addEventListener("pointerdown", onPointerDown, {capture: true});
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, {capture: true});
    };
  }, [uiState.menuOpen]);

  return (
    <>
      <button
        ref={toggleRef}
        className={'top-menu-toggle' + (uiState.menuOpen ? ' open' : '')} onClick={toggleMenu}>
        <span>
          <EllipsisVertical/>
        </span>
      </button>
      <section
        ref={menuRef}
        className={"top-menu" + (uiState.menuOpen ? ' open' : '')}>
        <div className={"container"}>
          <Button size={"small"}  type={"button"} variant="contained" color="secondary"  className={"button"} onClick={takeOver}><AdsClickSharpIcon /> Take over focus</Button>
          <Button size={"small"}  type={"button"} variant="contained" color="secondary"  className={"button"} onClick={() => {toggleMenu(); openSplash()}}><InfoOutlineSharpIcon /> About Queue Manager</Button>
        </div>
      </section>
    </>
  );
}
