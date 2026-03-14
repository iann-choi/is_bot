{{/*
공통 레이블
*/}}
{{- define "is-bot.labels" -}}
app.kubernetes.io/part-of: is-bot
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}
