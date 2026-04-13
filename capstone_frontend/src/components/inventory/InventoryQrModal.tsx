"use client";

import { Modal, ModalDialog, DialogTitle, Button, Stack } from "@mui/joy";
import { QRCodeCanvas } from "qrcode.react";
import { useRef } from "react";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";

export default function InventoryQrModal({ open, value, onClose }: any) {
  const qrRef = useRef<HTMLCanvasElement>(null);

  function handleDownload() {
    const canvas = qrRef.current;
    if (!canvas) return;

    // Convert the canvas to a PNG data URL and trigger a download
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `qr-${value ?? "code"}.png`;
    link.click();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ alignItems: "center", gap: 2 }}>

        <DialogTitle>QR Code</DialogTitle>

        {/* ref is forwarded to the underlying <canvas> element */}
        <QRCodeCanvas
          value={value}
          size={240}
          ref={qrRef}
        />

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            color="neutral"
            onClick={onClose}
          >
            Close
          </Button>

          <Button
            startDecorator={<DownloadRoundedIcon />}
            onClick={handleDownload}
          >
            Download
          </Button>
        </Stack>

      </ModalDialog>
    </Modal>
  );
}