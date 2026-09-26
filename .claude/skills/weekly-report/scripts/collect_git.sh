#!/usr/bin/env bash
# 사용법: collect_git.sh [since] [until] [author]
# 기본값: 이번 주 월요일 ~ 현재, 현재 git 사용자
set -euo pipefail
SINCE="${1:-$(date -d 'monday this week' +%Y-%m-%d 2>/dev/null || date -v-mon +%Y-%m-%d)}"
UNTIL="${2:-$(date -d tomorrow +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d)}"
AUTHOR="${3:-$(git config user.email || true)}"

echo "## 기간: $SINCE ~ $UNTIL / 작성자: ${AUTHOR:-전체}"
echo
echo "## 커밋"
git log --all --no-merges --since="$SINCE" --until="$UNTIL" ${AUTHOR:+--author="$AUTHOR"} \
  --date=short --pretty=format:'- %ad %h [%D] %s' | sed 's/ \[\]//'
echo
echo
echo "## 머지된 브랜치/PR"
git log --all --merges --since="$SINCE" --until="$UNTIL" --date=short --pretty=format:'- %ad %h %s'
echo
echo
echo "## 변경 규모"
git log --all --no-merges --since="$SINCE" --until="$UNTIL" ${AUTHOR:+--author="$AUTHOR"} \
  --shortstat --pretty=format: | awk '/changed/{f+=$1;i+=$4;d+=$6} END{printf "- 파일 %d개, +%d / -%d\n",f,i,d}'
