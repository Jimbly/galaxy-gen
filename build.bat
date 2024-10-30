xcopy /s /y ..\galaxy\dist\game\build.dev\client\*.* .
git add .
git commit -m "update"
git push