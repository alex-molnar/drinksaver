{{- define "drinksaver-admin.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "drinksaver-admin.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "drinksaver-admin.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "drinksaver-admin.labels" -}}
helm.sh/chart: {{ include "drinksaver-admin.chart" . }}
{{ include "drinksaver-admin.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "drinksaver-admin.selectorLabels" -}}
app.kubernetes.io/name: {{ include "drinksaver-admin.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "drinksaver-admin.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "drinksaver-admin.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
