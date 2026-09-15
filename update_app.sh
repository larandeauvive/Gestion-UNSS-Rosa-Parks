#!/bin/bash
sed -i 's/import { deleteMultipleStudents, updateMultipleStudents, addStudent } from .\lib\/db.;/import { useDatabase } from ".\/hooks\/useDatabase";/g' App.tsx
