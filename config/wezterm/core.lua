local core = {}

function core.setup()
	-- Pull in the wezterm API-- Pull in the wezterm API
	local wezterm = require("wezterm")

	-- This table will hold the configuration.
	local config = {}

	local home_dir = os.getenv("HOME")

	-- In newer versions of wezterm, use the config_builder which will
	-- help provide clearer error messages
	if wezterm.config_builder then
		config = wezterm.config_builder()
	end

	-- This is where you actually apply your config choices

	-- For example, changing the color scheme:
	-- config.color_scheme = 'Catppuccin Mocha'
	config.font = wezterm.font("Menlo", { weight = 'Bold'})
	config.font_size = 14
	config.window_background_image = home_dir .. "/.config/wezterm/static/back.jpg"

	config.window_background_image_hsb = {
		-- Darken the background image by reducing it to 1/3rd
		brightness = 0.3,

		-- You can adjust the hue by scaling its value.
		-- a multiplier of 1.0 leaves the value unchanged.
		hue = 1.0,

		-- You can adjust the saturation also.
		saturation = 1.0,
	}
	config.window_background_opacity = 0.15

	-- and finally, return the configuration to wezterm
	return config
end

return core


