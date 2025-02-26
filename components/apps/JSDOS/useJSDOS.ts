import {
  CAPTURED_KEYS,
  dosOptions,
  libs,
  pathPrefix,
} from "components/apps/JSDOS/config";
import useDosCI from "components/apps/JSDOS/useDosCI";
import useWindowSize from "components/system/Window/useWindowSize";
import { useProcesses } from "contexts/process";
import type { DosInstance } from "emulators-ui/dist/types/js-dos";
import { useEffect, useState } from "react";
import { loadFiles } from "utils/functions";

const captureKeys = (event: KeyboardEvent): void => {
  if (CAPTURED_KEYS.has(event.key)) event.preventDefault();
};

const useJSDOS = (
  id: string,
  url: string,
  containerRef: React.MutableRefObject<HTMLDivElement | null>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  loading: boolean
): void => {
  const { updateWindowSize } = useWindowSize(id);
  const [dosInstance, setDosInstance] = useState<DosInstance>();
  const dosCI = useDosCI(id, url, containerRef, dosInstance);
  const { closeWithTransition } = useProcesses();

  useEffect(() => {
    if (!dosInstance) {
      loadFiles(libs).then(() => {
        if (!window.emulators) return;

        window.emulators.pathPrefix = pathPrefix;

        if (containerRef.current) {
          const baseContainer = containerRef.current.closest("section");

          baseContainer?.addEventListener("keydown", captureKeys, {
            capture: true,
          });
          baseContainer?.addEventListener("keyup", captureKeys, {
            capture: true,
          });

          setDosInstance(window.Dos(containerRef.current, dosOptions));
        }
      });
    }
  }, [containerRef, dosInstance]);

  useEffect(() => {
    if (dosCI && loading) {
      updateWindowSize(dosCI.height(), dosCI.width());

      const events = dosCI.events();

      events.onMessage(
        (_msgType, _eventType, command: string, message: string) => {
          if (command === "LOG_EXEC") {
            const [dosCommand] = message
              .replace("Parsing command line: ", "")
              .split(" ");

            if (dosCommand.toUpperCase() === "EXIT") {
              closeWithTransition(id);
            }
          }
        }
      );
      events.onFrameSize((width, height) => {
        const {
          height: instanceHeight = height,
          width: instanceWidth = width,
        } = dosInstance?.layers || {};
        const frameSizeHalved =
          height === instanceHeight / 2 && width === instanceWidth / 2;
        const { height: currentHeight = 0, width: currentWidth = 0 } =
          containerRef.current?.getBoundingClientRect() || {};
        const [frameHeight, frameWidth] = [
          frameSizeHalved ? instanceHeight : height,
          frameSizeHalved ? instanceWidth : width,
        ];

        if (frameHeight !== currentHeight || frameWidth !== currentWidth) {
          updateWindowSize(frameHeight, frameWidth);
        }
      });
      events.onExit(() =>
        window.SimpleKeyboardInstances?.emulatorKeyboard?.destroy()
      );

      setLoading(false);
    }
  }, [
    closeWithTransition,
    containerRef,
    dosCI,
    dosInstance?.layers,
    id,
    loading,
    setLoading,
    updateWindowSize,
  ]);
};

export default useJSDOS;
