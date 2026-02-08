
# Make Logo Bigger Across Entire Website

## Overview

Increase the logo size consistently across all pages of the website for better brand visibility and visual impact.

---

## Current Logo Sizes

| Location | Current Size | File |
|----------|--------------|------|
| **Main Header** | `h-12 md:h-14` | `src/components/home/Header.tsx` |
| **Main Footer** | `h-16 md:h-24` | `src/components/home/Footer.tsx` |
| **Landing Header (Mobile)** | `h-8 sm:h-10` | `src/components/landing/LandingLayout.tsx` |
| **Landing Header (Desktop)** | `h-12 md:h-14` | `src/components/landing/LandingLayout.tsx` |
| **Landing Footer** | `h-10 sm:h-12` | `src/components/landing/Footer.tsx` |
| **Retargeting Header** | `h-10 md:h-12` | `src/pages/RetargetingLanding.tsx` |
| **Retargeting Footer** | `h-12 md:h-14` | `src/components/retargeting/RetargetingFooter.tsx` |
| **Admin Layout** (3 places) | `h-12` | `src/components/AdminLayout.tsx` |
| **CRM Login** | `h-20 md:h-24` | `src/pages/crm/CrmLogin.tsx` |
| **Agent Login** | `h-16 md:h-20` | `src/pages/crm/AgentLogin.tsx` |

---

## Proposed New Sizes

All logos increased by approximately 25% for better visibility:

| Location | Before | After |
|----------|--------|-------|
| **Main Header** | `h-12 md:h-14` | `h-14 md:h-16` |
| **Main Footer** | `h-16 md:h-24` | `h-20 md:h-28` |
| **Landing Header (Mobile)** | `h-8 sm:h-10` | `h-10 sm:h-12` |
| **Landing Header (Desktop)** | `h-12 md:h-14` | `h-14 md:h-16` |
| **Landing Footer** | `h-10 sm:h-12` | `h-12 sm:h-14` |
| **Retargeting Header** | `h-10 md:h-12` | `h-12 md:h-14` |
| **Retargeting Footer** | `h-12 md:h-14` | `h-14 md:h-16` |
| **Admin Layout** | `h-12` | `h-14` |
| **CRM Login** | `h-20 md:h-24` | `h-24 md:h-28` |
| **Agent Login** | `h-16 md:h-20` | `h-20 md:h-24` |

---

## Files to Update

| File | Changes |
|------|---------|
| `src/components/home/Header.tsx` | Line 200: Update height classes |
| `src/components/home/Footer.tsx` | Line 21: Update height classes |
| `src/components/landing/LandingLayout.tsx` | Lines 200, 212: Update both mobile and desktop heights |
| `src/components/landing/Footer.tsx` | Line 21: Update height classes |
| `src/pages/RetargetingLanding.tsx` | Line 115: Update height classes |
| `src/components/retargeting/RetargetingFooter.tsx` | Line 28: Update height classes |
| `src/components/AdminLayout.tsx` | Lines 169, 189, 196: Update all 3 logo heights |
| `src/pages/crm/CrmLogin.tsx` | Line 223: Update height classes |
| `src/pages/crm/AgentLogin.tsx` | Line 157: Update height classes |

---

## Summary

This change increases all logo sizes across **9 files** and **12 logo instances** for a more prominent brand presence throughout the entire website.
