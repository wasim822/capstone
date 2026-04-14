"use client";

import Link from "next/link";
import { Box, Button, Card, Stack, Typography } from "@mui/joy";

const reportLinks = [
  {
    title: "Employee Reports",
    description: "Attendance, performance, compliance, and workplace behavior records.",
    href: "/reports/reportType/employee",
    cta: "Open Employee Reports",
  },
  {
    title: "Injury Reports",
    description: "Workplace injury incidents, dates, witnesses, and location details.",
    href: "/reports/reportType/injury",
    cta: "Open Injury Reports",
  },
  {
    title: "Inventory Reports",
    description: "Lost, damaged, expired, or stolen inventory incident reports.",
    href: "/reports/reportType/inventory",
    cta: "Open Inventory Reports",
  },
];

export default function ReportsPage() {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography level="h1">Reports</Typography>
        <Typography level="body-sm" sx={{ color: "text.tertiary", mt: 0.5 }}>
          Choose a report category to create, manage, and review records.
        </Typography>
      </Box>

      <Stack spacing={2}>
        {reportLinks.map((report) => (
          <Card
            key={report.href}
            variant="outlined"
            sx={{
              borderRadius: "lg",
              p: 2.5,
              display: "flex",
              gap: 1.5,
              transition: "0.2s",
              "&:hover": { boxShadow: "md", transform: "translateY(-2px)" },
            }}
          >
            <Typography level="title-lg">{report.title}</Typography>
            <Typography level="body-sm" sx={{ color: "text.secondary" }}>
              {report.description}
            </Typography>

            <Box sx={{ mt: 1 }}>
              <Button component={Link} href={report.href} size="sm">
                {report.cta}
              </Button>
            </Box>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}