#version 460 core
layout(location = 0) out vec4 FragColor;

in vec2 TexCoords;

layout(binding = 0) uniform sampler2D screenTexture;
uniform int isFXAA;

// FXAA Parameters
const float EDGE_THRESHOLD_MIN = 0.0312;
const float EDGE_THRESHOLD_MAX = 0.125;
const float SUBPIXEL_QUALITY = .75;
const int QUALITY = 12; // Range from 1 to 12
const float ITERATIONS = float(QUALITY); // Same as QUALITY but as float

// From the NVIDIA FXAA whitepaper
float rgb2luma(vec3 rgb)
{
	return sqrt(dot(rgb, vec3(0.299, 0.587, 0.114)));
}

void main()
{
	vec2 screenSize = textureSize(screenTexture, 0);
	vec2 texelSize = 1.0 / screenSize;

    // Sample center and four corners
	vec3 colorCenter = texture(screenTexture, TexCoords).rgb;
	vec3 colorDown = texture(screenTexture, TexCoords + vec2(0, -1) * texelSize).rgb;
	vec3 colorUp = texture(screenTexture, TexCoords + vec2(0, 1) * texelSize).rgb;
	vec3 colorLeft = texture(screenTexture, TexCoords + vec2(-1, 0) * texelSize).rgb;
	vec3 colorRight = texture(screenTexture, TexCoords + vec2(1, 0) * texelSize).rgb;

    // Convert RGB to luminance
	float lumaCenter = rgb2luma(colorCenter);
	float lumaDown = rgb2luma(colorDown);
	float lumaUp = rgb2luma(colorUp);
	float lumaLeft = rgb2luma(colorLeft);
	float lumaRight = rgb2luma(colorRight);

    // Find the maximum and minimum luminance around the pixel
	float lumaMin = min(lumaCenter, min(min(lumaDown, lumaUp), min(lumaLeft, lumaRight)));
	float lumaMax = max(lumaCenter, max(max(lumaDown, lumaUp), max(lumaLeft, lumaRight)));

    // Compute the delta
	float lumaRange = lumaMax - lumaMin;

    // If the luma variation is lower than a threshold (or if we are in a really dark area), we are not on an edge, don't perform anti-aliasing
	if(lumaRange < max(EDGE_THRESHOLD_MIN, lumaMax * EDGE_THRESHOLD_MAX))
	{
		FragColor = vec4(colorCenter, 1.0);
		return;
	}

    // Query the 4 remaining corners lumas
	float lumaDownLeft = rgb2luma(texture(screenTexture, TexCoords + vec2(-1, -1) * texelSize).rgb);
	float lumaUpRight = rgb2luma(texture(screenTexture, TexCoords + vec2(1, 1) * texelSize).rgb);
	float lumaUpLeft = rgb2luma(texture(screenTexture, TexCoords + vec2(-1, 1) * texelSize).rgb);
	float lumaDownRight = rgb2luma(texture(screenTexture, TexCoords + vec2(1, -1) * texelSize).rgb);

    // Combine the four edges lumas (using intermediary variables for future computations with the same values)
	float lumaDownUp = lumaDown + lumaUp;
	float lumaLeftRight = lumaLeft + lumaRight;

    // Same for corners
	float lumaLeftCorners = lumaDownLeft + lumaUpLeft;
	float lumaDownCorners = lumaDownLeft + lumaDownRight;
	float lumaRightCorners = lumaDownRight + lumaUpRight;
	float lumaUpCorners = lumaUpRight + lumaUpLeft;

    // Compute an estimation of the gradient along the horizontal and vertical axis
	float edgeHorizontal = abs(-2.0 * lumaLeft + lumaLeftCorners) + abs(-2.0 * lumaCenter + lumaDownUp) * 2.0 + abs(-2.0 * lumaRight + lumaRightCorners);
	float edgeVertical = abs(-2.0 * lumaUp + lumaUpCorners) + abs(-2.0 * lumaCenter + lumaLeftRight) * 2.0 + abs(-2.0 * lumaDown + lumaDownCorners);

    // Is the local edge horizontal or vertical?
	bool isHorizontal = (edgeHorizontal >= edgeVertical);

    // Choose the step size based on the edge direction
	float stepLength = isHorizontal ? texelSize.y : texelSize.x;

    // Select the two neighboring texels lumas in the opposite direction to the local edge
	float luma1 = isHorizontal ? lumaDown : lumaLeft;
	float luma2 = isHorizontal ? lumaUp : lumaRight;

    // Compute gradients in this direction
	float gradient1 = luma1 - lumaCenter;
	float gradient2 = luma2 - lumaCenter;

    // Which direction is the steepest?
	bool is1Steepest = abs(gradient1) >= abs(gradient2);

    // Gradient in the corresponding direction, normalized
	float gradientScaled = 0.25 * max(abs(gradient1), abs(gradient2));

    // Choose the step size (one pixel) according to the edge direction
	stepLength = isHorizontal ? texelSize.y : texelSize.x;

    // Average luma in the correct direction
	float lumaLocalAverage = 0.0;

	if(is1Steepest)
	{
        // Switch the direction
		stepLength = -stepLength;
		lumaLocalAverage = 0.5 * (luma1 + lumaCenter);
	}
	else
	{
		lumaLocalAverage = 0.5 * (luma2 + lumaCenter);
	}

    // Shift UV in the correct direction by half a pixel
	vec2 currentUv = TexCoords;
	if(isHorizontal)
	{
		currentUv.y += stepLength * 0.5;
	}
	else
	{
		currentUv.x += stepLength * 0.5;
	}

    // Compute offset (for each iteration step)
	vec2 offset = isHorizontal ? vec2(texelSize.x, 0.0) : vec2(0.0, texelSize.y);

    // Compute UVs to explore on each side of the edge, orthogonally to the edge direction
	vec2 uv1 = currentUv - offset;
	vec2 uv2 = currentUv + offset;

    // Read the lumas at both current extremities of the exploration segment
	float lumaEnd1 = rgb2luma(texture(screenTexture, uv1).rgb);
	float lumaEnd2 = rgb2luma(texture(screenTexture, uv2).rgb);

    // Is the local edge pointing to the first side or the second one?
	lumaEnd1 -= lumaLocalAverage;
	lumaEnd2 -= lumaLocalAverage;

	bool reached1 = abs(lumaEnd1) >= gradientScaled;
	bool reached2 = abs(lumaEnd2) >= gradientScaled;
	bool reachedBoth = reached1 && reached2;

    // If the side is not reached, we continue to explore in this direction
	if(!reached1)
	{
		uv1 -= offset;
	}
	if(!reached2)
	{
		uv2 += offset;
	}

    // If both sides have not been reached, continue exploration
	if(!reachedBoth)
	{
		for(int i = 2; i < QUALITY; i++)
		{
            // If needed, read luma in 1st direction, compute delta
			if(!reached1)
			{
				lumaEnd1 = rgb2luma(texture(screenTexture, uv1).rgb);
				lumaEnd1 = lumaEnd1 - lumaLocalAverage;
			}
            // If needed, read luma in opposite direction, compute delta
			if(!reached2)
			{
				lumaEnd2 = rgb2luma(texture(screenTexture, uv2).rgb);
				lumaEnd2 = lumaEnd2 - lumaLocalAverage;
			}
            // If the deltas at the current extremities is larger than the local gradient, we have reached the side of the edge
			reached1 = abs(lumaEnd1) >= gradientScaled;
			reached2 = abs(lumaEnd2) >= gradientScaled;
			reachedBoth = reached1 && reached2;

            // If one of the sides has not been reached, continue exploration in this direction
			if(!reached1)
			{
				uv1 -= offset * (1.0 + float(i) * 0.2);
			}
			if(!reached2)
			{
				uv2 += offset * (1.0 + float(i) * 0.2);
			}

            // If both sides have been reached, stop the exploration
			if(reachedBoth)
				break;
		}
	}

    // Compute the distances to each side edge of the edge (!!)
	float distance1 = isHorizontal ? (TexCoords.x - uv1.x) : (TexCoords.y - uv1.y);
	float distance2 = isHorizontal ? (uv2.x - TexCoords.x) : (uv2.y - TexCoords.y);

    // In which direction is the side of the edge closer?
	bool isDirection1 = distance1 < distance2;
	float distanceFinal = min(distance1, distance2);

    // Length of the edge
	float edgeThickness = (distance1 + distance2);

    // UV offset: read in the direction of the closest side of the edge
	float pixelOffset = -distanceFinal / edgeThickness + 0.5;

    // Is the luma at center smaller than the local average?
	bool isLumaCenterSmaller = lumaCenter < lumaLocalAverage;

    // If the luma at center is smaller than at its neighbor, the delta luma at each end should be positive (same variation)
	bool correctVariation = ((isDirection1 ? lumaEnd1 : lumaEnd2) < 0.0) != isLumaCenterSmaller;

    // If the luma variation is incorrect, do not offset
	float finalOffset = correctVariation ? pixelOffset : 0.0;

    // Sub-pixel shifting
    // Full weighted average of the luma over the 3x3 neighborhood
	float lumaAverage = (1.0 / 12.0) * (2.0 * (lumaDownUp + lumaLeftRight) + lumaLeftCorners + lumaRightCorners);
    // Ratio of the delta between the global average and the center luma, over the luma range in the 3x3 neighborhood
	float subPixelOffset1 = clamp(abs(lumaAverage - lumaCenter) / lumaRange, 0.0, 1.0);
	float subPixelOffset2 = (-2.0 * subPixelOffset1 + 3.0) * subPixelOffset1 * subPixelOffset1;
    // Compute a sub-pixel offset based on this delta
	float subPixelOffsetFinal = subPixelOffset2 * subPixelOffset2 * SUBPIXEL_QUALITY;

    // Pick the biggest of the two offsets
	finalOffset = max(finalOffset, subPixelOffsetFinal);

    // Compute the final UV coordinates
	vec2 finalUv = TexCoords;
	if(isHorizontal)
	{
		finalUv.y += finalOffset * stepLength;
	}
	else
	{
		finalUv.x += finalOffset * stepLength;
	}

	vec3 finalColor = texture(screenTexture, finalUv).rgb;
	FragColor = isFXAA == 1 ? vec4(finalColor, 1.0) : vec4(colorCenter, 1.0);
}
