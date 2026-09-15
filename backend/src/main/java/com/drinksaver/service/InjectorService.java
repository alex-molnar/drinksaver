package com.drinksaver.service;

import com.drinksaver.config.RepositoryConfiguration;
import com.drinksaver.repository.AlcoholRepository;
import com.drinksaver.repository.BeerRepository;
import com.drinksaver.repository.DesignRepository;
import com.drinksaver.repository.DrinksRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class InjectorService {

    private final Map<String, AlcoholRepository> alcoholRepositories;
    private final Map<String, BeerRepository> beerRepositories;
    private final Map<String, DrinksRepository> drinksRepositories;
    private final Map<String, DesignRepository> designRepositories;
    private final RepositoryConfiguration repositoryConfiguration;

    @Autowired
    public InjectorService(
            Map<String, AlcoholRepository> alcoholRepositories,
            Map<String, BeerRepository> beerRepositories,
            Map<String, DrinksRepository> drinksRepositories,
            Map<String, DesignRepository> designRepositories,
            RepositoryConfiguration repositoryConfiguration
    ) {
        this.alcoholRepositories = alcoholRepositories;
        this.beerRepositories = beerRepositories;
        this.drinksRepositories = drinksRepositories;
        this.designRepositories = designRepositories;
        this.repositoryConfiguration = repositoryConfiguration;
    }

    public AlcoholRepository getAlcoholRepository() {
        return getAlcoholRepositoryByName(repositoryConfiguration.alcohol());
    }

    public BeerRepository getBeerRepository() {
        return getBeerRepositoryByName(repositoryConfiguration.beer());
    }

    public DrinksRepository getDrinksRepository() {
        return getDrinksRepositoryByName(repositoryConfiguration.drink());
    }

    public DesignRepository getDesignRepository() {
        return getDesignRepositoryByName(repositoryConfiguration.design());
    }

    private AlcoholRepository getAlcoholRepositoryByName(String name) {
        return alcoholRepositories
                .values()
                .stream()
                .filter(repo -> repo.is(name))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No such AlcoholRepository: " + name));
    }

    private BeerRepository getBeerRepositoryByName(String name) {
        return beerRepositories
                .values()
                .stream()
                .filter(repo -> repo.is(name))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No such BeerRepository: " + name));
    }

    private DrinksRepository getDrinksRepositoryByName(String name) {
        return drinksRepositories
                .values()
                .stream()
                .filter(repo -> repo.is(name))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No such DrinksRepository: " + name));
    }

    private DesignRepository getDesignRepositoryByName(String name) {
        return designRepositories
                .values()
                .stream()
                .filter(repo -> repo.is(name))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No such DesignRepository: " + name));

    }
}
