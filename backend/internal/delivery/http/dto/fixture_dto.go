package dto

type SyncFixtureRequest struct {
	Date     string `json:"date"`
	Timezone string `json:"timezone"`
}

type SyncFixtureResponse struct {
	Success  bool   `json:"success"`
	Fetched  int    `json:"fetched"`
	Saved    int    `json:"saved"`
	Date     string `json:"date"`
	Timezone string `json:"timezone"`
	Error    string `json:"error,omitempty"`
}

type GenerateTikTokRequest struct {
	SavePredictionRequest
}

type GenerateTikTokResponse struct {
	Success  bool   `json:"success"`
	Caption  string `json:"caption"`
	Hashtags string `json:"hashtags"`
	FullText string `json:"full_text"`
	Error    string `json:"error,omitempty"`
}
