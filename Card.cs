using UnityEngine;
using UnityEngine.UI;
using System.Collections;

public class Card : MonoBehaviour
{
    [Header("Card Components")]
    public Button cardButton;
    public GameObject frontFace;
    public GameObject backFace;
    public Image cardImage;
    public Text cardText;
    
    [Header("Card Sprites")]
    public Sprite[] cardSprites; // Array of card face images
    
    [Header("Animation Settings")]
    public float flipSpeed = 5f;
    public AnimationCurve flipCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);
    
    // Card properties
    private int cardValue;
    private bool isFlipped = false;
    private bool isMatched = false;
    private GameManager gameManager;
    private Coroutine flipCoroutine;
    
    // Visual effects
    private Vector3 originalScale;
    private Color originalColor;

    public int CardValue => cardValue;
    public bool IsFlipped => isFlipped;
    public bool IsMatched => isMatched;

    private void Awake()
    {
        // Get components
        if (!cardButton) cardButton = GetComponent<Button>();
        if (!cardImage) cardImage = GetComponentInChildren<Image>();
        
        // Store original values
        originalScale = transform.localScale;
        originalColor = cardImage ? cardImage.color : Color.white;
        
        // Setup button click
        cardButton.onClick.AddListener(OnCardClick);
    }

    public void Initialize(int value, GameManager manager)
    {
        cardValue = value;
        gameManager = manager;
        
        // Set card appearance
        SetCardAppearance();
        
        // Start face down
        isFlipped = false;
        isMatched = false;
        ShowBackFace();
    }

    private void SetCardAppearance()
    {
        // Set card sprite based on value
        if (cardSprites != null && cardSprites.Length > cardValue)
        {
            cardImage.sprite = cardSprites[cardValue];
        }
        
        // Set card text (fallback if no sprites)
        if (cardText)
        {
            cardText.text = GetCardSymbol(cardValue);
        }
    }

    private string GetCardSymbol(int value)
    {
        // Convert number to symbol/emoji
        string[] symbols = { "🍎", "🍌", "🍊", "🍇", "🍓", "🥝", "🍑", "🍒", 
                           "🌟", "⭐", "💎", "🎯", "🎪", "🎨", "🎭", "🎪" };
        
        return value < symbols.Length ? symbols[value] : value.ToString();
    }

    private void OnCardClick()
    {
        if (gameManager && !isMatched)
        {
            gameManager.OnCardClicked(this);
        }
    }

    public void Flip()
    {
        if (flipCoroutine != null)
            StopCoroutine(flipCoroutine);
            
        flipCoroutine = StartCoroutine(FlipAnimation(true));
    }

    public void FlipBack()
    {
        if (flipCoroutine != null)
            StopCoroutine(flipCoroutine);
            
        flipCoroutine = StartCoroutine(FlipAnimation(false));
    }

    private IEnumerator FlipAnimation(bool flipToFront)
    {
        isFlipped = flipToFront;
        
        // First half of flip - scale down
        float elapsedTime = 0f;
        float halfFlipTime = (1f / flipSpeed) * 0.5f;
        
        Vector3 startScale = transform.localScale;
        Vector3 midScale = new Vector3(0.1f, startScale.y, startScale.z);
        
        while (elapsedTime < halfFlipTime)
        {
            elapsedTime += Time.deltaTime;
            float progress = elapsedTime / halfFlipTime;
            progress = flipCurve.Evaluate(progress);
            
            transform.localScale = Vector3.Lerp(startScale, midScale, progress);
            yield return null;
        }
        
        // Switch faces at the middle of animation
        if (flipToFront)
        {
            ShowFrontFace();
        }
        else
        {
            ShowBackFace();
        }
        
        // Second half of flip - scale back up
        elapsedTime = 0f;
        Vector3 endScale = originalScale;
        
        while (elapsedTime < halfFlipTime)
        {
            elapsedTime += Time.deltaTime;
            float progress = elapsedTime / halfFlipTime;
            progress = flipCurve.Evaluate(progress);
            
            transform.localScale = Vector3.Lerp(midScale, endScale, progress);
            yield return null;
        }
        
        transform.localScale = endScale;
        flipCoroutine = null;
    }

    private void ShowFrontFace()
    {
        if (frontFace) frontFace.SetActive(true);
        if (backFace) backFace.SetActive(false);
        
        // Set card image/text visible
        if (cardImage) cardImage.enabled = true;
        if (cardText) cardText.enabled = true;
    }

    private void ShowBackFace()
    {
        if (frontFace) frontFace.SetActive(false);
        if (backFace) backFace.SetActive(true);
        
        // Hide card image/text
        if (cardImage) cardImage.enabled = false;
        if (cardText) cardText.enabled = false;
    }

    public void SetMatched()
    {
        isMatched = true;
        StartCoroutine(MatchedAnimation());
    }

    private IEnumerator MatchedAnimation()
    {
        // Pulse effect
        float duration = 0.5f;
        float elapsedTime = 0f;
        
        Vector3 pulseScale = originalScale * 1.2f;
        Color highlightColor = Color.green;
        
        while (elapsedTime < duration)
        {
            elapsedTime += Time.deltaTime;
            float progress = elapsedTime / duration;
            
            // Pulse scale
            float scaleProgress = Mathf.Sin(progress * Mathf.PI);
            transform.localScale = Vector3.Lerp(originalScale, pulseScale, scaleProgress);
            
            // Color tint
            if (cardImage)
            {
                cardImage.color = Color.Lerp(originalColor, highlightColor, scaleProgress);
            }
            
            yield return null;
        }
        
        // Return to normal
        transform.localScale = originalScale;
        if (cardImage)
        {
            cardImage.color = originalColor;
        }
        
        // Add particle effect
        CreateMatchParticles();
    }

    private void CreateMatchParticles()
    {
        // Simple particle effect using UI elements
        GameObject particleContainer = new GameObject("MatchParticles");
        particleContainer.transform.SetParent(transform);
        particleContainer.transform.localPosition = Vector3.zero;
        
        // Create multiple small particles
        for (int i = 0; i < 5; i++)
        {
            GameObject particle = new GameObject("Particle");
            particle.transform.SetParent(particleContainer.transform);
            
            Image particleImage = particle.AddComponent<Image>();
            particleImage.color = Color.yellow;
            particleImage.sprite = cardImage ? cardImage.sprite : null;
            
            RectTransform rect = particle.GetComponent<RectTransform>();
            rect.sizeDelta = new Vector2(20, 20);
            rect.localPosition = Vector3.zero;
            
            // Animate particle
            StartCoroutine(AnimateParticle(particle, i));
        }
        
        // Destroy particle container after animation
        Destroy(particleContainer, 2f);
    }

    private IEnumerator AnimateParticle(GameObject particle, int index)
    {
        float duration = 1f;
        float elapsedTime = 0f;
        
        Vector3 startPos = Vector3.zero;
        Vector3 endPos = Random.insideUnitCircle * 100f;
        
        Image particleImage = particle.GetComponent<Image>();
        Color startColor = particleImage.color;
        Color endColor = new Color(startColor.r, startColor.g, startColor.b, 0f);
        
        while (elapsedTime < duration)
        {
            elapsedTime += Time.deltaTime;
            float progress = elapsedTime / duration;
            
            // Move particle
            particle.transform.localPosition = Vector3.Lerp(startPos, endPos, progress);
            
            // Fade out
            particleImage.color = Color.Lerp(startColor, endColor, progress);
            
            yield return null;
        }
        
        Destroy(particle);
    }

    public void ResetCard()
    {
        isFlipped = false;
        isMatched = false;
        transform.localScale = originalScale;
        
        if (cardImage)
        {
            cardImage.color = originalColor;
        }
        
        ShowBackFace();
    }

    // Hover effects for better UX
    public void OnPointerEnter()
    {
        if (!isMatched && !isFlipped)
        {
            transform.localScale = originalScale * 1.05f;
        }
    }

    public void OnPointerExit()
    {
        if (!isMatched && !isFlipped)
        {
            transform.localScale = originalScale;
        }
    }
}